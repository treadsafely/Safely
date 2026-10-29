import type {
    IEnumerableStorage,
    SSecretDecrypted,
    SSecretEncrypted,
    ISecureSecretEncryptor
} from '@safely/core';
import { TreeStorage } from '@safely/core';
import type { ITreeStorage, IVaultSecretEncryptor } from '@safely/sync';

import type { IUnlockableSecuredEncryptedStorage, Security } from './types';

export class UnlockableSecuredEncryptedStorage
    extends TreeStorage
    implements IUnlockableSecuredEncryptedStorage
{
    #isLocked = true;

    public get isLocked() {
        return this.#isLocked;
    }

    constructor(
        encryptedStorage: IEnumerableStorage,
        private readonly security: Security,
        public path: string[] = []
    ) {
        const storage: IEnumerableStorage = {
            getItem: async (key: string) => {
                await this.securityCheck();
                return encryptedStorage.getItem(key);
            },
            setItem: async (key: string, value: string) => {
                await this.securityCheck();
                return encryptedStorage.setItem(key, value);
            },
            removeItem: async (key: string) => {
                await this.securityCheck();
                return encryptedStorage.removeItem(key);
            },
            clear: async () => {
                await this.securityCheck();
                return encryptedStorage.clear();
            },
            getAllKeys: async () => {
                await this.securityCheck();
                return encryptedStorage.getAllKeys();
            },
            getKeysWithPrefix: async (prefix: string) => {
                await this.securityCheck();
                return encryptedStorage.getKeysWithPrefix(prefix);
            },
            removeItemsWithPrefix: async (prefix: string) => {
                await this.securityCheck();
                return encryptedStorage.removeItemsWithPrefix(prefix);
            }
        };

        super(path, storage);
    }

    private async securityCheck() {
        if (this.isLocked) {
            await this.security.check();
        }
    }

    public async unlock() {
        await this.security.check();
        this.#isLocked = false;
    }

    public UNSAFE_SKIP_SECURITY_CHECK_unlock() {
        this.#isLocked = false;
    }

    public [Symbol.dispose]() {
        this.#isLocked = true;
    }
}

export class BaseSecureSecretEncryptor implements ISecureSecretEncryptor {
    public readonly kind = 'secure';

    constructor(
        private readonly syncEncryptor: IVaultSecretEncryptor,
        private readonly secureStorage: ITreeStorage
    ) {}

    public encrypt(decryptedSecret: SSecretDecrypted): Promise<SSecretEncrypted> {
        return this.syncEncryptor.encrypt(decryptedSecret, this.secureStorage);
    }

    public decrypt(encryptedSecret: SSecretEncrypted): Promise<SSecretDecrypted> {
        return this.syncEncryptor.decrypt(encryptedSecret, this.secureStorage);
    }
}

export class UnlockableSecureSecretEncryptor implements ISecureSecretEncryptor {
    public readonly kind = 'secure';

    readonly #encryptStorage: IUnlockableSecuredEncryptedStorage;

    readonly #decryptStorage: IUnlockableSecuredEncryptedStorage;

    public get isEncryptLocked() {
        return this.#encryptStorage.isLocked;
    }

    public get isDecryptLocked() {
        return this.#decryptStorage.isLocked;
    }

    constructor(
        private readonly syncEncryptor: IVaultSecretEncryptor,
        getSecureStorage: () => IUnlockableSecuredEncryptedStorage
    ) {
        this.#decryptStorage = getSecureStorage();
        this.#encryptStorage = getSecureStorage();
    }

    public unlockEncryption() {
        return this.#encryptStorage.unlock();
    }

    public unlockDecryption() {
        return this.#decryptStorage.unlock();
    }

    public encrypt(decryptedSecret: SSecretDecrypted): Promise<SSecretEncrypted> {
        return this.syncEncryptor.encrypt(decryptedSecret, this.#encryptStorage);
    }

    public decrypt(encryptedSecret: SSecretEncrypted): Promise<SSecretDecrypted> {
        return this.syncEncryptor.decrypt(encryptedSecret, this.#decryptStorage);
    }

    public [Symbol.dispose]() {
        this.#decryptStorage[Symbol.dispose]();
        this.#encryptStorage[Symbol.dispose]();
    }
}
