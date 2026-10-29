import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';

export class SymmetricCipher {
    constructor(private readonly getKey: () => Promise<Buffer>) {}

    public async encrypt(data: Buffer): Promise<{ ciphertext: Buffer; nonce: Buffer }> {
        const nonce = crypto.getRandomValues(new Uint8Array(24));

        return await this.withKey(key => {
            const ciphertext = xchacha20poly1305(key, nonce).encrypt(data);
            return { ciphertext: Buffer.from(ciphertext), nonce: Buffer.from(nonce) };
        });
    }

    public async decrypt(ciphertext: Buffer, nonce: Buffer): Promise<Buffer> {
        return await this.withKey(key => {
            const decrypted = xchacha20poly1305(key, nonce).decrypt(ciphertext);
            return Buffer.from(decrypted);
        });
    }

    private async withKey<T>(operation: (key: Buffer) => T): Promise<T> {
        const key = await this.getKey();

        try {
            return operation(key);
        } finally {
            key.fill(0);
        }
    }
}
