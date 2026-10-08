import { sha256 } from '@noble/hashes/sha2.js';

import { ed25519_sign, ed25519_verify } from '../ed25519';
import type { EncryptedKeyRepository } from '../encrypted-key-repository';

export interface IIkService {
    sign(data: Buffer): Promise<Buffer>;
    verify(data: Buffer, sig: Buffer): boolean;
    getPub(): Buffer;
}

export class IkService implements IIkService {
    private readonly kid: Buffer;

    constructor(private readonly keyRepository: EncryptedKeyRepository) {
        this.kid = Buffer.from(sha256(this.keyRepository.getIKPub())).slice(0, 16);
    }

    public async sign(data: Buffer): Promise<Buffer> {
        const ik = await this.keyRepository.getIKPrv();
        if (ik === null) {
            throw new Error('Identity key not found.');
        }
        try {
            const sig = ed25519_sign(data, ik);
            return Buffer.from(sig);
        } finally {
            ik.fill(0);
        }
    }

    public verify(data: Buffer, sig: Buffer): boolean {
        const ikPub = this.keyRepository.getIKPub();
        return ed25519_verify(sig, data, ikPub);
    }

    public getPub(): Buffer {
        return this.keyRepository.getIKPub();
    }

    public getKID(): Buffer {
        return Buffer.from(this.kid);
    }
}
