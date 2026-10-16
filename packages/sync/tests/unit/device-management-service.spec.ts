import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ed25519_keygen } from '../../src/crypto/ed25519';
import {
    DeviceAlreadyExistsError,
    ReconnectFromAnotherAccountError
} from '../../src/device-manager/device-management-service';
import { OfflineSyncProvider } from '../../src/sync-provider/offline-sync-provider';
import { getKID } from '../../src/utils/kid';
import { MockSnapshotsServer } from '../mocks/mock-snapshots-api';
import { createMachineContext, getMasterKey, waitFor } from '../mocks/mock-sync-context';
import type { MachineContext } from '../mocks/mock-sync-context';

describe('device management service', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    let server: MockSnapshotsServer;

    beforeEach(() => {
        server = new MockSnapshotsServer();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function deviceIkPub(i: number) {
        return Buffer.from(`ikPub${i}`);
    }

    function add(ctx: MachineContext, i: number) {
        return ctx.container.deviceManager.addDevice(
            Buffer.from(`ikPub${i}`),
            ctx.container.keyServiceFactory.createDmkSignerService(ctx.secureEncryptedStorage)
        );
    }

    function addPub(ctx: MachineContext, ikPub: Buffer) {
        return ctx.container.deviceManager.addDevice(
            ikPub,
            ctx.container.keyServiceFactory.createDmkSignerService(ctx.secureEncryptedStorage)
        );
    }

    function revokePub(ctx: MachineContext, ikPub: Buffer) {
        return ctx.container.deviceManager.revokeDevice(
            ikPub,
            ctx.container.keyServiceFactory.createDmkSignerService(ctx.secureEncryptedStorage)
        );
    }

    async function verifyDeviceList(ctx: MachineContext, expectedDevices: Buffer[]) {
        const devices = await ctx.container.deviceManager.getDevices();
        expect(devices).toHaveLength(expectedDevices.length);
        for (const expectedDevice of expectedDevices) {
            const device = devices.find(d => d.info.ikPub.equals(expectedDevice));
            expect(device).toEqual({
                info: {
                    ikPub: expectedDevice,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    addedAt: expect.any(Number)
                },
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                sign: expect.any(Buffer)
            });
        }
        // verify that list is sorted by addedAt
        for (let i = 1; i < devices.length; i++) {
            expect(devices[i].info.addedAt).toBeGreaterThanOrEqual(devices[i - 1].info.addedAt);
        }
    }

    async function verifyStoredDeviceState(
        ctx: MachineContext,
        ikPub: Buffer,
        expectedType: 'active' | 'added' | 'revoked'
    ) {
        const devices = await ctx.container.deviceRepository.getStoredDevices();
        expect(devices[getKID(ikPub)]?.type).toBe(expectedType);
    }

    it('adds device as added and hides it from public list', async () => {
        const ctx = await createMachineContext(server);

        expect(await ctx.container.deviceManager.getDevices()).toEqual([]);

        await add(ctx, 1);

        expect(await ctx.container.deviceManager.getDevices()).toEqual([]);
        await verifyStoredDeviceState(ctx, deviceIkPub(1), 'added');
    });

    it.each(['added', 'active'] as const)(
        'preserves an existing %s device when added again',
        async type => {
            const ctx = await createMachineContext(server);
            const ikPub = ctx.container.ikService.getPub();

            await addPub(ctx, ikPub);
            if (type === 'active') {
                await ctx.container.deviceManager.activate();
            }

            const snapshot = ctx.container.deviceYManager.encodeAsSnapshot();
            const signer = ctx.container.keyServiceFactory.createDmkSignerService(
                ctx.secureEncryptedStorage
            );
            const signSpy = vi.spyOn(signer, 'signAddDeviceForStorage');

            await ctx.container.deviceManager.addDevice(Buffer.from(ikPub), signer);

            expect(ctx.container.deviceYManager.encodeAsSnapshot()).toEqual(snapshot);
            expect(signSpy).not.toHaveBeenCalled();
            await verifyStoredDeviceState(ctx, ikPub, type);
        }
    );

    it('adds a revoked device again', async () => {
        const ctx = await createMachineContext(server);
        const ikPub = ctx.container.ikService.getPub();

        await addPub(ctx, ikPub);
        await ctx.container.deviceManager.activate();
        await revokePub(ctx, ikPub);
        await verifyStoredDeviceState(ctx, ikPub, 'revoked');

        await addPub(ctx, ikPub);

        await verifyStoredDeviceState(ctx, ikPub, 'added');
        expect(await ctx.container.deviceManager.getDevices()).toEqual([]);
    });

    it('activates this device', async () => {
        const ctx = await createMachineContext(server);
        const ikPub = ctx.container.ikService.getPub();

        await addPub(ctx, ikPub);
        await verifyStoredDeviceState(ctx, ikPub, 'added');

        await ctx.container.deviceManager.activate();

        await verifyDeviceList(ctx, [ikPub]);
        await verifyStoredDeviceState(ctx, ikPub, 'active');
    });

    it('notifies when devices change', async () => {
        const ctx = await createMachineContext(server);
        const provider = new OfflineSyncProvider(ctx.container as never);
        const ikPub = ctx.container.ikService.getPub();
        const seen: Buffer[][] = [];
        const unsubscribe = provider.onDevicesChange(devices => {
            seen.push(devices.map(device => device.info.ikPub));
        });

        await addPub(ctx, ikPub);
        await waitFor(() => seen.length === 1);
        expect(seen[0]).toEqual([]);

        await ctx.container.deviceManager.activate();
        await waitFor(() => seen.length === 2);
        expect(seen[1]).toHaveLength(1);
        expect(seen[1][0].equals(ikPub)).toBe(true);

        unsubscribe();
        await revokePub(ctx, ikPub);
        await new Promise(resolve => setTimeout(resolve, 20));
        expect(seen).toHaveLength(2);
    });

    it('adds 10 devices', async () => {
        const ctx = await createMachineContext(server);

        for (let i = 0; i < 10; i++) {
            await add(ctx, i);
        }

        expect(await ctx.container.deviceManager.getDevices()).toEqual([]);
        for (let i = 0; i < 10; i++) {
            await verifyStoredDeviceState(ctx, deviceIkPub(i), 'added');
        }
    });

    it('adds 2 devices and revokes 1', async () => {
        const ctx = await createMachineContext(server);
        const ikPub = ctx.container.ikService.getPub();

        expect(await ctx.container.deviceManager.getDevices()).toEqual([]);

        await addPub(ctx, ikPub);
        await ctx.container.deviceManager.activate();
        await add(ctx, 2);

        await verifyDeviceList(ctx, [ikPub]);
        await verifyStoredDeviceState(ctx, deviceIkPub(2), 'added');
        await revokePub(ctx, ikPub);

        await verifyDeviceList(ctx, []);
        await verifyStoredDeviceState(ctx, ikPub, 'revoked');
    });

    it('removes stale added devices', async () => {
        const ctx = await createMachineContext(server);
        const ikPub = deviceIkPub(1);
        const addedAt = new Date('2026-01-01T00:00:00.000Z');

        vi.useFakeTimers();
        vi.setSystemTime(addedAt);
        await addPub(ctx, ikPub);

        const addedDevice = await ctx.container.deviceRepository.getStoredDevice(getKID(ikPub));
        expect(addedDevice).toMatchObject({
            type: 'added',
            info: {
                addedAt: addedAt.getTime()
            }
        });

        vi.setSystemTime(addedAt.getTime() + DAY_MS);
        await ctx.container.deviceManager.cleanupStaleAddedDevices();

        expect(await ctx.container.deviceRepository.getStoredDevice(getKID(ikPub))).toBeUndefined();
    });

    it('keeps fresh added devices and active devices during stale added cleanup', async () => {
        const ctx = await createMachineContext(server);
        const activeIkPub = ctx.container.ikService.getPub();
        const addedIkPub = deviceIkPub(2);
        const addedAt = new Date('2026-01-01T00:00:00.000Z');

        vi.useFakeTimers();
        vi.setSystemTime(addedAt);
        await addPub(ctx, activeIkPub);
        await ctx.container.deviceManager.activate();
        await addPub(ctx, addedIkPub);

        const addedDevice = await ctx.container.deviceRepository.getStoredDevice(
            getKID(addedIkPub)
        );
        expect(addedDevice?.type).toBe('added');
        if (!addedDevice || addedDevice.type !== 'added') {
            throw new Error('Expected added device');
        }

        vi.setSystemTime(addedAt.getTime() + DAY_MS - 1);
        await ctx.container.deviceManager.cleanupStaleAddedDevices();

        await verifyStoredDeviceState(ctx, activeIkPub, 'active');
        await verifyStoredDeviceState(ctx, addedIkPub, 'added');
    });

    it('logs only start and result for device add and revoke operations', async () => {
        const ctx = await createMachineContext(server);
        const ikPub = ctx.container.ikService.getPub();
        const infoSpy = vi.spyOn(ctx.container.logger, 'info').mockImplementation(() => {});
        const errorSpy = vi.spyOn(ctx.container.logger, 'error').mockImplementation(() => {});

        await addPub(ctx, ikPub);
        await ctx.container.deviceManager.activate();
        await revokePub(ctx, ikPub);

        const syncFlows = infoSpy.mock.calls
            .filter(([message]) => message === 'sync.flow')
            .map(([, event]) => (event as { flow: string }).flow);

        expect(syncFlows).toEqual([
            'device_management.add_device',
            'device_management.add_device.added',
            'device_management.revoke_device',
            'device_management.revoke_device.revoked'
        ]);
        expect(errorSpy).not.toHaveBeenCalledWith('sync.flow', expect.anything());
    });

    it('allows reconnect only for revoked devices', async () => {
        const ctx = await createMachineContext(server);
        const ikPub = ctx.container.ikService.getPub();
        const addedIkPub = deviceIkPub(2);

        await expect(ctx.container.deviceManager.assertDeviceCanReconnect(ikPub)).rejects.toThrow(
            ReconnectFromAnotherAccountError
        );

        await addPub(ctx, addedIkPub);
        await expect(
            ctx.container.deviceManager.assertDeviceCanReconnect(addedIkPub)
        ).rejects.toThrow(DeviceAlreadyExistsError);

        await addPub(ctx, ikPub);
        await ctx.container.deviceManager.activate();
        await expect(ctx.container.deviceManager.assertDeviceCanReconnect(ikPub)).rejects.toThrow(
            DeviceAlreadyExistsError
        );

        await revokePub(ctx, ikPub);
        await expect(ctx.container.deviceManager.assertDeviceCanReconnect(ikPub)).resolves.toBe(
            undefined
        );
    });

    it('applies other device updates', async () => {
        const masterKey = getMasterKey(5);
        const ik1 = ed25519_keygen();
        const ik2 = ed25519_keygen();

        const ctx1 = await createMachineContext(server, masterKey, ik1);
        const ctx2 = await createMachineContext(server, masterKey, ik2);

        await addPub(ctx1, ik1.publicKey);
        await ctx1.container.deviceManager.activate();
        await addPub(ctx1, ik2.publicKey);

        await verifyDeviceList(ctx1, [ik1.publicKey]);
        await verifyStoredDeviceState(ctx1, ik2.publicKey, 'added');

        await ctx2.container.deviceManager.mergeDeviceStorage(
            ctx1.container.deviceYManager.encodeAsSnapshot()
        );
        await ctx2.container.deviceManager.activate();

        await verifyDeviceList(ctx2, [ik1.publicKey, ik2.publicKey]);
        await verifyStoredDeviceState(ctx2, ik2.publicKey, 'active');

        await ctx1.container.deviceManager.mergeDeviceStorage(
            ctx2.container.deviceYManager.encodeAsSnapshot()
        );

        await revokePub(ctx1, ik1.publicKey);
        await verifyDeviceList(ctx1, [ik2.publicKey]);

        await ctx2.container.deviceManager.mergeDeviceStorage(
            ctx1.container.deviceYManager.encodeAsSnapshot()
        );

        await verifyDeviceList(ctx2, [ik2.publicKey]);
    });
});
