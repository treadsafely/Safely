import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';

import type { EncryptedKeyRepository } from '../encrypted-key-repository';

export class SyncKeyService {
    constructor(private readonly keyRepository: EncryptedKeyRepository) {}

    public async encrypt(data: Buffer): Promise<{ ciphertext: Buffer; nonce: Buffer }> {
        const nonce = crypto.getRandomValues(new Uint8Array(24));

        return await this.withSyncKey(key => {
            const ciphertext = xchacha20poly1305(key, nonce).encrypt(data);
            return { ciphertext: Buffer.from(ciphertext), nonce: Buffer.from(nonce) };
        });
    }

    public async decrypt(ciphertext: Buffer, nonce: Buffer): Promise<Buffer> {
        return await this.withSyncKey(key => {
            const decrypted = xchacha20poly1305(key, nonce).decrypt(ciphertext);
            return Buffer.from(decrypted);
        });
    }

    private async withSyncKey<T>(operation: (key: Buffer) => T): Promise<T> {
        const key = await this.keyRepository.getSyncKey();

        try {
            return operation(key);
        } finally {
            key.fill(0);
        }
    }
}
