import { z } from 'zod';

import type { KeyServiceFactory } from './crypto/service/key-service-factory';
import { SymmetricCipher } from './crypto/service/symmetric-cipher';
import type { ITreeStorage } from './I-storage';
import { hex } from './utils/buffer';

export const sSecretEncrypted = z.string();
export type SSecretEncrypted = z.infer<typeof sSecretEncrypted>;

export const sSecretDecrypted = z.string();
export type SSecretDecrypted = z.infer<typeof sSecretDecrypted>;

export interface IVaultSecretEncryptor {
    encrypt(
        decryptedSecret: SSecretDecrypted,
        secureEncryptedStorage: ITreeStorage
    ): Promise<SSecretEncrypted>;
    decrypt(
        encryptedSecret: SSecretEncrypted,
        secureEncryptedStorage: ITreeStorage
    ): Promise<SSecretDecrypted>;
}

const PAYLOAD_VERSION = 0x01;

function encodePayload({ ciphertext, nonce }: { ciphertext: Buffer; nonce: Buffer }): string {
    return Buffer.concat([Buffer.from([PAYLOAD_VERSION]), nonce, ciphertext]).toString('hex');
}

function decodePayload(encryptedPayload: string): { ciphertext: Buffer; nonce: Buffer } {
    const data = hex(encryptedPayload);
    const version = data[0];
    if (version !== PAYLOAD_VERSION) {
        throw new Error(`Unsupported version: ${version}`);
    }
    return { nonce: data.subarray(1, 25), ciphertext: data.subarray(25) };
}

export class SecureSecretEncryptor implements IVaultSecretEncryptor {
    constructor(private readonly keyServiceFactory: KeyServiceFactory) {}

    public async encrypt(plaintext: string, secureEncryptedStorage: ITreeStorage): Promise<string> {
        const encrypted = await this.keyServiceFactory
            .createVaultKeyService(secureEncryptedStorage)
            .encrypt(Buffer.from(plaintext, 'utf8'));
        return encodePayload(encrypted);
    }

    public async decrypt(
        encryptedPayload: string,
        secureEncryptedStorage: ITreeStorage
    ): Promise<string> {
        const { ciphertext, nonce } = decodePayload(encryptedPayload);
        const plaintext = await this.keyServiceFactory
            .createVaultKeyService(secureEncryptedStorage)
            .decrypt(ciphertext, nonce);
        return plaintext.toString('utf8');
    }
}

export class SilentSecretEncryptor {
    public readonly kind = 'silent';

    private readonly cipher: SymmetricCipher;

    constructor(getKey: () => Promise<Buffer>) {
        this.cipher = new SymmetricCipher(getKey);
    }

    public async encrypt(plaintext: SSecretDecrypted): Promise<SSecretEncrypted> {
        return encodePayload(await this.cipher.encrypt(Buffer.from(plaintext, 'utf8')));
    }

    public async decrypt(encryptedPayload: SSecretEncrypted): Promise<SSecretDecrypted> {
        const { ciphertext, nonce } = decodePayload(encryptedPayload);
        return (await this.cipher.decrypt(ciphertext, nonce)).toString('utf8');
    }
}
