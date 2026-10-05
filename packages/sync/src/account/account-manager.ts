import type { AssertVersionHList, HCons, StorageVersion } from '@safely/slottree';

import type { ISyncAccount } from './I-sync-account';
import { getSyncAccountStorage } from './sync-account-storage';
import type { SyncContainerConfig } from '../sync-container';
import { createSyncContainer } from '../sync-container';
import type { CreateAccountService } from './create-account-service';
import { SyncAccount } from './sync-account';
import type { SyncAccountRepository } from './sync-account-repository';
import type { ITreeStorage } from '../I-storage';
import type { SyncFlowLogger } from '../logger';
import type { OnboardingMessagePayload } from '../onboarding/onboarding-message-payload';
import { OfflineSyncProvider } from '../sync-provider/offline-sync-provider';
import { OnlineSyncProvider } from '../sync-provider/online-sync-provider';

export class AccountManager<Latest extends StorageVersion, Rest> {
    private readonly accounts = new Map<string, ISyncAccount<Latest>>();
    private readonly loadingAccounts = new Map<string, Promise<ISyncAccount<Latest>>>();

    constructor(
        private readonly storage: ITreeStorage,
        private readonly encryptedStorage: ITreeStorage,
        private readonly syncAccountIdRepository: SyncAccountRepository,
        private readonly versions: HCons<Latest, Rest> & AssertVersionHList<HCons<Latest, Rest>>,
        private readonly createAccountService: CreateAccountService<Latest, Rest>,
        private readonly syncContainerConfig: SyncContainerConfig
    ) {}

    public async getAccounts(): Promise<ISyncAccount<Latest>[]> {
        if (this.accounts.size === 0) {
            await this.initializeAccounts();
        }
        return [...this.accounts.values()];
    }

    private async initializeAccounts(): Promise<void> {
        const accountInfos = await this.syncAccountIdRepository.getSyncAccounts();
        for (const accountInfo of accountInfos) {
            await this.getSyncAccount(accountInfo.accountId);
        }
    }

    public async getSyncAccount(accountId: string): Promise<ISyncAccount<Latest>> {
        const account = this.accounts.get(accountId);
        if (account) {
            return account;
        }

        const loadingAccount = this.loadingAccounts.get(accountId);
        if (loadingAccount) {
            return await loadingAccount;
        }

        const promise = this.initializeSyncAccount(accountId).finally(() => {
            if (this.loadingAccounts.get(accountId) === promise) {
                this.loadingAccounts.delete(accountId);
            }
        });
        this.loadingAccounts.set(accountId, promise);
        return await promise;
    }

    private async initializeSyncAccount(accountId: string): Promise<ISyncAccount<Latest>> {
        const accountInfo = await this.syncAccountIdRepository.getSyncAccount(accountId);

        const storage = getSyncAccountStorage(this.storage, accountInfo.accountId);
        const encryptedStorage = getSyncAccountStorage(
            this.encryptedStorage,
            accountInfo.accountId
        );
        const container = await createSyncContainer({
            accountId,
            versions: this.versions,
            storage,
            encryptedStorage,
            ...this.syncContainerConfig
        });

        const syncProvider = accountInfo.online
            ? await OnlineSyncProvider.create(container)
            : new OfflineSyncProvider(container);

        const acc = new SyncAccount({
            accountId: accountInfo.accountId,
            structure: this.versions,
            syncProvider,
            container,
            syncAccountRepository: this.syncAccountIdRepository,
            online: accountInfo.online
        });
        this.accounts.set(accountId, acc);
        return acc;
    }

    public async createOfflineAccount(
        secureEncryptedStorage: ITreeStorage
    ): Promise<ISyncAccount<Latest>> {
        const account =
            await this.createAccountService.createOfflineAccount(secureEncryptedStorage);
        this.accounts.set(account.accountId, account);
        return account;
    }

    public async createOnlineAccountFromMasterKey(
        secureEncryptedStorage: ITreeStorage,
        payload: OnboardingMessagePayload,
        ik: { publicKey: Buffer; secretKey: Buffer },
        flow: SyncFlowLogger
    ) {
        const account = await this.createAccountService.createOnlineAccountFromMasterKey(
            secureEncryptedStorage,
            payload,
            ik,
            flow
        );
        this.accounts.set(account.accountId, account);
        return account;
    }

    public async deleteAccount(
        accountId: string,
        secureEncryptedStorage: ITreeStorage
    ): Promise<void> {
        await this.loadingAccounts.get(accountId);

        const accountInfo = await this.syncAccountIdRepository.getSyncAccount(accountId);

        if (accountInfo.online) {
            const account = (await this.getSyncAccount(accountId)) as SyncAccount<Latest, Rest>;
            await account.deleteThisDevice(secureEncryptedStorage);
        }

        const storage = getSyncAccountStorage(this.storage, accountId);
        const encryptedStorage = getSyncAccountStorage(this.encryptedStorage, accountId);
        const secureKeychainStorage = getSyncAccountStorage(secureEncryptedStorage, accountId);
        await storage.clear();
        await encryptedStorage.clear();
        await secureKeychainStorage.clear();
        await this.syncAccountIdRepository.removeAccount(accountId);

        this.accounts.delete(accountId);
    }
}
