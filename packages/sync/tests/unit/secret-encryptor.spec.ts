import { randomBytes } from '@noble/ciphers/utils.js';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ITreeStorage } from '../../src';
import { EncryptedKeyRepository } from '../../src/crypto/encrypted-key-repository';
import { SecureEncryptedKeyRepository } from '../../src/crypto/secure-encrypted-key-repository';
import { KeyServiceFactory } from '../../src/crypto/service/key-service-factory';
import { generateAccountID, initializeKeys } from '../../src/initialize';
import { SilentSecretEncryptor, SecureSecretEncryptor } from '../../src/secret-encryptor';
import { InMemStorage } from '../mocks/server-mock/storage';

describe('sync machine', () => {
    let secretEncryptor: SecureSecretEncryptor;
    let secureEncryptedStorage: ITreeStorage;

    beforeEach(async () => {
        const masterKey = Buffer.from(randomBytes(32));
        const accountId = await generateAccountID(masterKey);

        const encryptedStorage = new InMemStorage();
        secureEncryptedStorage = new InMemStorage();
        const keyRepository = new EncryptedKeyRepository(encryptedStorage.child(accountId));
        const secureEncryptedKeyRepository = new SecureEncryptedKeyRepository(
            secureEncryptedStorage.child(accountId)
        );
        await initializeKeys(keyRepository, secureEncryptedKeyRepository, masterKey);
        secretEncryptor = new SecureSecretEncryptor(new KeyServiceFactory(accountId));
    });

    it('should encrypt and decrypt the same message', async () => {
        const encryptedPayload = await secretEncryptor.encrypt(
            'hello world',
            secureEncryptedStorage
        );
        expect(encryptedPayload).not.toEqual('hello world');
        const plaintext = await secretEncryptor.decrypt(encryptedPayload, secureEncryptedStorage);
        expect(plaintext).toBe('hello world');
    });

    it('should fail on wrong version', async () => {
        const encryptedPayload = await secretEncryptor.encrypt(
            'hello world',
            secureEncryptedStorage
        );
        const data = Buffer.from(encryptedPayload, 'hex');
        data[0] = 0x02; // change version to unsupported one
        const tamperedPayload = data.toString('hex');
        await expect(
            secretEncryptor.decrypt(tamperedPayload, secureEncryptedStorage)
        ).rejects.toThrow('Unsupported version: 2');
    });
});

describe('SilentSecretEncryptor', () => {
    const key = Buffer.from(randomBytes(32));
    const encryptor = new SilentSecretEncryptor(async () => Buffer.from(key));

    it('round-trips a secret in the mnemonic payload format', async () => {
        const encryptedPayload = await encryptor.encrypt('view key');

        expect(encryptedPayload.startsWith('01')).toBe(true);
        expect(encryptedPayload).not.toContain(Buffer.from('view key').toString('hex'));
        await expect(encryptor.decrypt(encryptedPayload)).resolves.toBe('view key');
    });

    it('rejects a payload sealed with another key', async () => {
        const other = new SilentSecretEncryptor(async () => Buffer.from(randomBytes(32)));

        await expect(encryptor.decrypt(await other.encrypt('view key'))).rejects.toThrow();
    });

    it('wipes the key it was handed once the operation is done', async () => {
        const handed: Buffer[] = [];
        const wiping = new SilentSecretEncryptor(async () => {
            const copy = Buffer.from(key);
            handed.push(copy);
            return copy;
        });

        await wiping.decrypt(await wiping.encrypt('view key'));

        expect(handed).toHaveLength(2);
        expect(handed.every(buffer => buffer.every(byte => byte === 0))).toBe(true);
    });
});
