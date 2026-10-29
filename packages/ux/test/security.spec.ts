import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IEnumerableStorage, SSecretDecrypted, SSecretEncrypted } from '@safely/core';
import { TreeStorage } from '@safely/core';
import type { IVaultSecretEncryptor, ITreeStorage } from '@safely/sync';
import { MKDerivationDomain } from '@safely/sync';

import type { IUnlockableSecuredEncryptedStorage, Security } from '../src/shared/security';
import {
    AccountDataKey,
    UnlockableSecureSecretEncryptor,
    UnlockableSecuredEncryptedStorage
} from '../src/shared/security';

function createMemoryStorage(): IEnumerableStorage {
    const map = new Map<string, string>();
    return {
        getItem: vi.fn(async (key: string) => map.get(key) ?? null),
        setItem: vi.fn(async (key: string, value: string) => {
            map.set(key, value);
        }),
        removeItem: vi.fn(async (key: string) => {
            map.delete(key);
        }),
        clear: vi.fn(async () => {
            map.clear();
        }),
        getAllKeys: vi.fn(async () => [...map.keys()]),
        getKeysWithPrefix: vi.fn(async (prefix: string) =>
            [...map.keys()].filter(k => k.startsWith(prefix))
        ),
        removeItemsWithPrefix: vi.fn(async (prefix: string) => {
            for (const k of [...map.keys()]) {
                if (k.startsWith(prefix)) map.delete(k);
            }
        })
    };
}

function createSecurity(): Security & { check: ReturnType<typeof vi.fn> } {
    return { check: vi.fn(async () => undefined) };
}

describe('UnlockableSecuredEncryptedStorage', () => {
    let storage: IEnumerableStorage;
    let security: Security & { check: ReturnType<typeof vi.fn> };
    let secured: UnlockableSecuredEncryptedStorage;

    beforeEach(() => {
        storage = createMemoryStorage();
        security = createSecurity();
        secured = new UnlockableSecuredEncryptedStorage(storage, security);
    });

    it('starts locked', () => {
        expect(secured.isLocked).toBe(true);
    });

    it('runs security check on every storage method while locked', async () => {
        await secured.setItem('a', '1');
        await secured.getItem('a');
        await secured.removeItem('a');
        await secured.clear();
        expect(security.check).toHaveBeenCalledTimes(4);
    });

    it('unlock() runs the security check and clears the locked flag', async () => {
        await secured.unlock();
        expect(security.check).toHaveBeenCalledTimes(1);
        expect(secured.isLocked).toBe(false);
    });

    it('skips security check after unlock()', async () => {
        await secured.unlock();
        security.check.mockClear();

        await secured.setItem('a', '1');
        await secured.getItem('a');
        await secured.removeItem('a');
        await secured.clear();

        expect(security.check).not.toHaveBeenCalled();
    });

    it('UNSAFE_SKIP_SECURITY_CHECK_unlock() unlocks without invoking security', () => {
        secured.UNSAFE_SKIP_SECURITY_CHECK_unlock();
        expect(secured.isLocked).toBe(false);
        expect(security.check).not.toHaveBeenCalled();
    });

    it('Symbol.dispose re-locks the storage', async () => {
        await secured.unlock();
        secured[Symbol.dispose]();

        expect(secured.isLocked).toBe(true);

        await secured.setItem('a', '1');
        // 1 from initial unlock + 1 from setItem after re-lock
        expect(security.check).toHaveBeenCalledTimes(2);
    });

    it('propagates security check rejections and stays locked', async () => {
        const error = new Error('user cancelled');
        security.check.mockRejectedValueOnce(error);

        await expect(secured.unlock()).rejects.toBe(error);
        expect(secured.isLocked).toBe(true);
    });

    it('does not write to underlying storage if the check fails', async () => {
        security.check.mockRejectedValueOnce(new Error('cancelled'));
        await expect(secured.setItem('a', '1')).rejects.toThrow('cancelled');
        expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('forwards reads/writes through TreeStorage path encoding when unlocked', async () => {
        const nested = new UnlockableSecuredEncryptedStorage(storage, security, ['acc', 'sub']);
        nested.UNSAFE_SKIP_SECURITY_CHECK_unlock();

        await nested.setItem('key', 'value');
        expect(storage.setItem).toHaveBeenCalledWith('acc..sub..key', 'value');
        await expect(nested.getItem('key')).resolves.toBe('value');
    });

    it('clear() removes only items under the storage path', async () => {
        const root = new UnlockableSecuredEncryptedStorage(storage, security, ['acc']);
        const sibling = new UnlockableSecuredEncryptedStorage(storage, security, ['other']);
        root.UNSAFE_SKIP_SECURITY_CHECK_unlock();
        sibling.UNSAFE_SKIP_SECURITY_CHECK_unlock();

        await root.setItem('k1', 'v1');
        await sibling.setItem('k2', 'v2');

        await root.clear();

        await expect(root.getItem('k1')).resolves.toBeNull();
        await expect(sibling.getItem('k2')).resolves.toBe('v2');
    });

    it('getOwnKeys() returns decoded direct child keys via TreeStorage', async () => {
        const root = new UnlockableSecuredEncryptedStorage(storage, security, ['acc']);
        root.UNSAFE_SKIP_SECURITY_CHECK_unlock();

        await root.setItem('a', '1');
        await root.setItem('b', '2');

        await expect(root.getOwnKeys()).resolves.toEqual(expect.arrayContaining(['a', 'b']));
    });
});

describe('UnlockableSecureSecretEncryptor', () => {
    function createSyncEncryptor(): IVaultSecretEncryptor {
        return {
            encrypt: vi.fn(async (plaintext: SSecretDecrypted) => `enc(${plaintext})`),
            decrypt: vi.fn(async (ciphertext: SSecretEncrypted) =>
                ciphertext.replace(/^enc\((.*)\)$/, '$1')
            )
        };
    }

    function createFactory() {
        const created: UnlockableSecuredEncryptedStorage[] = [];
        const factory = () => {
            const inst = new UnlockableSecuredEncryptedStorage(
                createMemoryStorage(),
                createSecurity()
            );
            created.push(inst);
            return inst;
        };
        return { factory, created };
    }

    it('creates two independent storages on construction', () => {
        const sync = createSyncEncryptor();
        const { factory, created } = createFactory();

        const enc = new UnlockableSecureSecretEncryptor(sync, factory);

        expect(created).toHaveLength(2);
        expect(created[0]).not.toBe(created[1]);
        expect(enc.isEncryptLocked).toBe(true);
        expect(enc.isDecryptLocked).toBe(true);
    });

    it('unlockEncryption only unlocks the encrypt-side storage', async () => {
        const sync = createSyncEncryptor();
        const { factory } = createFactory();

        const enc = new UnlockableSecureSecretEncryptor(sync, factory);
        await enc.unlockEncryption();

        expect(enc.isEncryptLocked).toBe(false);
        expect(enc.isDecryptLocked).toBe(true);
    });

    it('unlockDecryption only unlocks the decrypt-side storage', async () => {
        const sync = createSyncEncryptor();
        const { factory } = createFactory();

        const enc = new UnlockableSecureSecretEncryptor(sync, factory);
        await enc.unlockDecryption();

        expect(enc.isEncryptLocked).toBe(true);
        expect(enc.isDecryptLocked).toBe(false);
    });

    it('encrypt() forwards to the sync encryptor with the encrypt-side storage', async () => {
        const sync = createSyncEncryptor();
        const { factory, created } = createFactory();
        const enc = new UnlockableSecureSecretEncryptor(sync, factory);

        const result = await enc.encrypt('plaintext');
        expect(result).toBe('enc(plaintext)');

        expect(sync.encrypt).toHaveBeenCalledTimes(1);
        // Per construction order, the second factory call is the encrypt storage.
        expect(sync.encrypt).toHaveBeenCalledWith('plaintext', created[1]);
    });

    it('decrypt() forwards to the sync encryptor with the decrypt-side storage', async () => {
        const sync = createSyncEncryptor();
        const { factory, created } = createFactory();
        const enc = new UnlockableSecureSecretEncryptor(sync, factory);

        const result = await enc.decrypt('enc(plaintext)');
        expect(result).toBe('plaintext');

        expect(sync.decrypt).toHaveBeenCalledTimes(1);
        expect(sync.decrypt).toHaveBeenCalledWith('enc(plaintext)', created[0]);
    });

    it('encrypt and decrypt use different storages', async () => {
        const sync = createSyncEncryptor();
        const { factory } = createFactory();
        const enc = new UnlockableSecureSecretEncryptor(sync, factory);

        await enc.encrypt('a');
        await enc.decrypt('enc(a)');

        const encStorage = (sync.encrypt as ReturnType<typeof vi.fn>).mock.calls[0][1];
        const decStorage = (sync.decrypt as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(encStorage).not.toBe(decStorage);
    });

    it('Symbol.dispose disposes both inner storages', async () => {
        const sync = createSyncEncryptor();
        const { factory } = createFactory();
        const enc = new UnlockableSecureSecretEncryptor(sync, factory);

        await enc.unlockEncryption();
        await enc.unlockDecryption();
        expect(enc.isEncryptLocked).toBe(false);
        expect(enc.isDecryptLocked).toBe(false);

        enc[Symbol.dispose]();

        expect(enc.isEncryptLocked).toBe(true);
        expect(enc.isDecryptLocked).toBe(true);
    });

    it('passes through encrypt errors from the sync encryptor', async () => {
        const sync = createSyncEncryptor();
        (sync.encrypt as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
        const { factory } = createFactory();
        const enc = new UnlockableSecureSecretEncryptor(sync, factory);

        await expect(enc.encrypt('x')).rejects.toThrow('boom');
    });

    it('uses a custom storage stub to verify the storage is the one passed in', async () => {
        const sync = createSyncEncryptor();
        const stubs: ITreeStorage[] = [];
        const factory = () => {
            const stub = {
                isLocked: true,
                unlock: vi.fn(async () => undefined),
                UNSAFE_SKIP_SECURITY_CHECK_unlock: vi.fn(),
                [Symbol.dispose]: vi.fn(),
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn(),
                getOwnKeys: vi.fn(),
                child: vi.fn()
            } as unknown as IUnlockableSecuredEncryptedStorage;
            stubs.push(stub);
            return stub;
        };

        const enc = new UnlockableSecureSecretEncryptor(sync, factory);

        await enc.encrypt('p');
        await enc.decrypt('c');

        expect(sync.encrypt).toHaveBeenCalledWith('p', stubs[1]);
        expect(sync.decrypt).toHaveBeenCalledWith('c', stubs[0]);
    });
});

describe('account data key', () => {
    const MASTER_DERIVED = Buffer.alloc(32, 5);

    function createDevice() {
        const security = createSecurity();
        const secureBacking = createMemoryStorage();
        const encrypted = TreeStorage.root(createMemoryStorage());
        const account = {
            accountId: 'account-1',
            deriveKeyFromMasterKey: vi.fn(
                async (_domain: MKDerivationDomain, secureStorage: ITreeStorage) => {
                    await secureStorage.getItem('master_key');
                    return Buffer.from(MASTER_DERIVED);
                }
            )
        };
        const storages = {
            encrypted,
            getSecureEncrypted: vi.fn(
                () => new UnlockableSecuredEncryptedStorage(secureBacking, security)
            )
        };
        return { security, encrypted, account, storages };
    }

    it('derives the key once without a security check and then reads it from storage', async () => {
        const { security, account, storages } = createDevice();

        const first = await new AccountDataKey(account, storages).get();
        const second = await new AccountDataKey(account, storages).get();

        expect(first).toEqual(MASTER_DERIVED);
        expect(second).toEqual(MASTER_DERIVED);
        expect(account.deriveKeyFromMasterKey).toHaveBeenCalledTimes(1);
        expect(account.deriveKeyFromMasterKey).toHaveBeenCalledWith(
            MKDerivationDomain.ACCOUNT_DATA_KEY,
            expect.anything()
        );
        expect(security.check).not.toHaveBeenCalled();
    });

    it('derives the key once when several first reads run at the same time', async () => {
        const { account, storages } = createDevice();

        const keys = await Promise.all([
            new AccountDataKey(account, storages).get(),
            new AccountDataKey(account, storages).get(),
            new AccountDataKey(account, storages).get()
        ]);

        keys.forEach(key => expect(key).toEqual(MASTER_DERIVED));
        expect(account.deriveKeyFromMasterKey).toHaveBeenCalledTimes(1);
        expect(storages.getSecureEncrypted).toHaveBeenCalledTimes(1);
        keys[0].fill(0);
        expect(keys[1]).toEqual(MASTER_DERIVED);
    });

    it('reads a key stored at account creation without opening the secure storage', async () => {
        const { security, account, storages } = createDevice();
        const secureStorage = new UnlockableSecuredEncryptedStorage(
            createMemoryStorage(),
            security
        );
        secureStorage.UNSAFE_SKIP_SECURITY_CHECK_unlock();

        await new AccountDataKey(account, storages).create(secureStorage);

        await expect(new AccountDataKey(account, storages).get()).resolves.toEqual(MASTER_DERIVED);
        expect(storages.getSecureEncrypted).not.toHaveBeenCalled();
        expect(account.deriveKeyFromMasterKey).toHaveBeenCalledTimes(1);
    });

    it('keeps the key under the account node, so clearing the account drops it', async () => {
        const { encrypted, account, storages } = createDevice();

        await new AccountDataKey(account, storages).get();
        await encrypted.child(['account-1']).clear();
        await new AccountDataKey(account, storages).get();

        expect(account.deriveKeyFromMasterKey).toHaveBeenCalledTimes(2);
    });

    it('lets another device of the account open what one device encrypted', async () => {
        const one = createDevice();
        const other = createDevice();

        const encrypted = await new AccountDataKey(one.account, one.storages)
            .encryptor()
            .encrypt('view-key');

        expect(encrypted).not.toContain('view-key');
        await expect(
            new AccountDataKey(other.account, other.storages).encryptor().decrypt(encrypted)
        ).resolves.toBe('view-key');
    });
});
