import type { ISilentSecretEncryptor, ITreeStorage } from '@safely/core';
import type { ISyncAccount } from '@safely/sync';
import { SilentSecretEncryptor, MKDerivationDomain } from '@safely/sync';

import type { IUnlockableSecuredEncryptedStorage } from './types';

type MasterKeyDeriver = Pick<ISyncAccount<never>, 'accountId' | 'deriveKeyFromMasterKey'>;

export type AccountDataKeyStorages = {
    encrypted: ITreeStorage;
    getSecureEncrypted(this: void): IUnlockableSecuredEncryptedStorage;
};

// module-wide, since every portfolio restore builds its own AccountDataKey
const pendingDerivations = new Map<string, Promise<void>>();

export class AccountDataKey {
    constructor(
        private readonly account: MasterKeyDeriver,
        private readonly storages: AccountDataKeyStorages
    ) {}

    public async get(): Promise<Buffer> {
        let stored = await this.slot().getItem(MKDerivationDomain.ACCOUNT_DATA_KEY);
        if (stored === null) {
            await this.deriveOnce();
            stored = await this.slot().getItem(MKDerivationDomain.ACCOUNT_DATA_KEY);
        }
        if (stored === null) throw new Error('Account data key was not stored');
        return Buffer.from(stored, 'hex');
    }

    public async create(secureEncryptedStorage: ITreeStorage): Promise<void> {
        (await this.deriveAndStore(secureEncryptedStorage)).fill(0);
    }

    public encryptor(): ISilentSecretEncryptor {
        return new SilentSecretEncryptor(() => this.get());
    }

    private deriveOnce(): Promise<void> {
        const { accountId } = this.account;
        let pending = pendingDerivations.get(accountId);
        if (!pending) {
            pending = this.deriveWithoutPresenceCheck().finally(() =>
                pendingDerivations.delete(accountId)
            );
            pendingDerivations.set(accountId, pending);
        }
        return pending;
    }

    private async deriveWithoutPresenceCheck(): Promise<void> {
        using secureStorage = this.storages.getSecureEncrypted();
        // no presence check by design, see packages/sync/doc/spec.md §1.4
        secureStorage.UNSAFE_SKIP_SECURITY_CHECK_unlock();
        (await this.deriveAndStore(secureStorage)).fill(0);
    }

    private async deriveAndStore(secureEncryptedStorage: ITreeStorage): Promise<Buffer> {
        const key = await this.account.deriveKeyFromMasterKey(
            MKDerivationDomain.ACCOUNT_DATA_KEY,
            secureEncryptedStorage
        );
        await this.slot().setItem(MKDerivationDomain.ACCOUNT_DATA_KEY, key.toString('hex'));
        return key;
    }

    private slot(): ITreeStorage {
        // under the account's own node, so deleting the account wipes the key too
        return this.storages.encrypted.child([this.account.accountId, 'masterKeyDerived']);
    }
}
