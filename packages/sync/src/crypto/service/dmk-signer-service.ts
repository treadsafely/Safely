import {
    getAddDeviceSignaturePayload,
    getRevokeDeviceSignaturePayload,
    getServerAddDeviceSignaturePayload,
    getServerRevokeDeviceSignaturePayload
} from '../../device-manager/device-signature-payload';
import { ed25519_sign } from '../ed25519';
import type { SecureEncryptedKeyRepository } from '../secure-encrypted-key-repository';

export class DmkSignerService {
    constructor(private readonly keyRepository: SecureEncryptedKeyRepository) {}

    public async signAddDeviceForServer(ikPub: Buffer): Promise<Buffer> {
        return await this.sign(getServerAddDeviceSignaturePayload(ikPub));
    }

    public async signRevokeDeviceForServer(ikPub: Buffer): Promise<Buffer> {
        return await this.sign(getServerRevokeDeviceSignaturePayload(ikPub));
    }

    public async signAddDeviceForStorage(ikPub: Buffer, addedAt: number): Promise<Buffer> {
        return await this.sign(getAddDeviceSignaturePayload({ ikPub, addedAt }));
    }

    public async signRevokeDeviceForStorage(ikPub: Buffer): Promise<Buffer> {
        return await this.sign(getRevokeDeviceSignaturePayload({ ikPub }));
    }

    private async sign(data: Buffer): Promise<Buffer> {
        const ik = await this.keyRepository.getDMKPrv();
        if (ik === null) {
            throw new Error('Identity key not found.');
        }
        try {
            return ed25519_sign(data, ik);
        } finally {
            ik.fill(0);
        }
    }
}
