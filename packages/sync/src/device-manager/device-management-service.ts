import type { DeviceRepository } from './device-repository';
import type { Device, StoredDevice } from './device-storage-schema';
import type { DmkSignerService } from '../crypto/service/dmk-signer-service';
import type { DmkVerifierService } from '../crypto/service/dmk-verifier-service';
import type { IkService } from '../crypto/service/ik-service';
import type { Logger } from '../logger';
import { SyncFlowLogger } from '../logger';
import { SyncError } from '../sync-error';
import {
    getAddDeviceSignaturePayload,
    getRevokeDeviceSignaturePayload
} from './device-signature-payload';
import { getKID } from '../utils/kid';
import { waitForChange } from '../utils/wait-for-change';

const STALE_ADDED_DEVICE_TTL_MS = 24 * 60 * 60 * 1000;

export class DeviceManagementService {
    constructor(
        private readonly deviceRepository: DeviceRepository,
        private readonly ikService: IkService,
        private readonly dmkVerifierService: DmkVerifierService,
        private readonly logger: Logger
    ) {}

    public onChange(observer: () => void): () => void {
        return this.deviceRepository.onChange(observer);
    }

    public async getDevices(): Promise<Device[]> {
        return await this.deviceRepository.getDevices();
    }

    public async isDeviceVisible(ikPub: Buffer): Promise<boolean> {
        const devices = await this.getDevices();
        return devices.some(d => d.info.ikPub.equals(ikPub));
    }

    public async waitUntilDeviceVisible(
        ikPub: Buffer,
        opts: {
            timeoutMs?: number;
            timeoutError?: () => Error;
        } = {}
    ): Promise<void> {
        const timeoutError =
            opts.timeoutError ?? (() => new DeviceManagerError('Device did not become visible'));

        await waitForChange({
            subscribe: observer => this.onChange(observer),
            predicate: () => this.isDeviceVisible(ikPub),
            timeoutMs: opts.timeoutMs ?? 5000,
            timeoutError
        });
    }

    public async addDevice(ikPub: Buffer, dmkSignerService: DmkSignerService): Promise<void> {
        const flow = this.startFlow('device_management.add_device', {
            ikPub: ikPub.toString('hex')
        });

        try {
            const existingDevice = await this.deviceRepository.getStoredDevice(getKID(ikPub));
            if (existingDevice && existingDevice.type !== 'revoked') {
                flow.logEnd('already_exists');
                return;
            }

            const device = await this.makeDevice(ikPub, dmkSignerService);
            await this.deviceRepository.addDevice(device);
            flow.logEnd('added');
        } catch (error) {
            flow.logFail(error, 'failed');
            throw error;
        }
    }

    public async activate(): Promise<void> {
        const device = await this.getThisStoredDevice();
        if (!device || device.type !== 'added') {
            return;
        }

        await this.deviceRepository.activateDevice({
            info: device.info,
            sign: device.sign
        });
        this.logger
            .child('device_management')
            .info('Device activated', { ikPub: device.info.ikPub.toString('hex') });
    }

    public async cleanupStaleAddedDevices(): Promise<void> {
        const now = Date.now();
        const ttlMs = STALE_ADDED_DEVICE_TTL_MS;
        const devices = await this.deviceRepository.getStoredDevices();

        for (const device of Object.values(devices)) {
            if (device.type === 'added' && device.info.addedAt <= now - ttlMs) {
                await this.deviceRepository.deleteDevice(device.info.ikPub);
            }
        }
    }

    public async isThisDeviceActive(): Promise<boolean> {
        const device = await this.getThisStoredDevice();
        return device?.type === 'active';
    }

    public async isThisDeviceRevoked(): Promise<boolean> {
        const device = await this.getThisStoredDevice();
        return device?.type === 'revoked';
    }

    public async assertDeviceCanReconnect(ikPub: Buffer): Promise<void> {
        const device = await this.deviceRepository.getStoredDevice(getKID(ikPub));
        if (!device) {
            throw new ReconnectFromAnotherAccountError(
                `Device with the given IK ${ikPub.toString('hex')} does not belong to this account.`
            );
        }

        if (device.type !== 'revoked') {
            throw new DeviceAlreadyExistsError(
                `Device with the given IK ${ikPub.toString('hex')} already exists.`
            );
        }
    }

    public async revokeDevice(ikPub: Buffer, dmkSignerService: DmkSignerService): Promise<void> {
        const flow = this.startFlow('device_management.revoke_device', {
            ikPub: ikPub.toString('hex')
        });

        try {
            const devices = await this.getDevices();
            if (!devices.some(d => d.info.ikPub.equals(ikPub))) {
                throw new Error('Device not found.');
            }

            const sign = await dmkSignerService.signRevokeDeviceForStorage(ikPub);

            await this.deviceRepository.revokeDevice(ikPub, sign);
            flow.logEnd('revoked');
        } catch (error) {
            flow.logFail(error, 'failed');
            throw error;
        }
    }

    public async mergeDeviceStorage(update: Buffer): Promise<void> {
        const localDevices = await this.deviceRepository.getStoredDevices();
        const remoteDevices = this.deviceRepository.readStoredDevicesFromSnapshot(update);

        for (const [kid, remoteDevice] of Object.entries(remoteDevices)) {
            const localDevice = localDevices[kid];
            if (localDevice && storedDeviceEquals(localDevice, remoteDevice)) {
                continue;
            }

            await this.verifyStoredDevice(remoteDevice);
        }

        await this.deviceRepository.applyUpdate(update);
    }

    public async verifyStoredDevice(device: StoredDevice): Promise<void> {
        const isValid = this.dmkVerifierService.verify(
            device.sign,
            this.getStoredDeviceSignData(device)
        );

        if (!isValid) {
            throw new InvalidDMKSignatureError('Invalid device signature.');
        }
    }

    public async makeDevice(ikPub: Buffer, dmkSignerService: DmkSignerService): Promise<Device> {
        const devices = await this.deviceRepository.getStoredDevices();
        if (Object.values(devices).some(d => d.type !== 'revoked' && d.info.ikPub.equals(ikPub))) {
            throw new DeviceAlreadyExistsError('Device with the same ikPub already exists.');
        }
        const addedAt = Date.now();
        const sign = await dmkSignerService.signAddDeviceForStorage(ikPub, addedAt);
        return {
            info: {
                ikPub,
                addedAt
            },
            sign
        };
    }

    private async getThisStoredDevice(): Promise<StoredDevice | undefined> {
        const ikPub = this.ikService.getPub();
        return await this.deviceRepository.getStoredDevice(getKID(ikPub));
    }

    private getStoredDeviceSignData(device: StoredDevice): Buffer {
        if (device.type === 'active' || device.type === 'added') {
            return getAddDeviceSignaturePayload(device.info);
        }

        return getRevokeDeviceSignaturePayload(device.info);
    }

    private startFlow(flow: string, fields: Record<string, unknown> = {}): SyncFlowLogger {
        return SyncFlowLogger.start(this.logger, flow, fields);
    }
}

function storedDeviceEquals(left: StoredDevice, right: StoredDevice): boolean {
    if (left.type !== right.type || !left.info.ikPub.equals(right.info.ikPub)) {
        return false;
    }

    if (!left.sign.equals(right.sign)) {
        return false;
    }

    if (left.type === 'revoked' || right.type === 'revoked') {
        return true;
    }

    return left.info.addedAt === right.info.addedAt;
}

export class DeviceManagerError extends SyncError {}
export class InvalidDMKSignatureError extends DeviceManagerError {}
export class UnknownDeviceError extends DeviceManagerError {}
export class DeviceAlreadyExistsError extends DeviceManagerError {}
export class ReconnectFromAnotherAccountError extends DeviceManagerError {}
