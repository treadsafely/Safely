import type { AssertVersionHList, HCons, StorageVersion } from '@safely/slottree';

import { generateAccountID, generateMasterKey, initializeSyncAccount } from '../initialize';
import { getSyncAccountStorage } from './sync-account-storage';
import type { SyncContainerConfig } from '../sync-container';
import { createSyncContainer } from '../sync-container';
import { SyncAccount } from './sync-account';
import type { SyncAccountRepository } from './sync-account-repository';
import type { ITreeStorage } from '../I-storage';
import type { SyncFlowLogger } from '../logger';
import type { OnboardingMessagePayload } from '../onboarding/onboarding-message-payload';
import { AccountAlreadyExistsError } from '../sync-error';
import { OfflineSyncProvider } from '../sync-provider/offline-sync-provider';
import { OnlineSyncProvider } from '../sync-provider/online-sync-provider';
import { SyncStatus } from '../sync-provider/sync-status';

export class CreateAccountService<Latest extends StorageVersion, Rest> {
    constructor(
        private readonly storage: ITreeStorage,
        private readonly encryptedStorage: ITreeStorage,
        private readonly syncAccountIDRepository: SyncAccountRepository,
        private readonly versions: HCons<Latest, Rest> & AssertVersionHList<HCons<Latest, Rest>>,
        private readonly syncContainerConfig: SyncContainerConfig
    ) {}

    public async createOfflineAccount(secureEncryptedStorage: ITreeStorage) {
        const masterKey = await generateMasterKey();
        const accountID = await generateAccountID(masterKey);

        const storage = getSyncAccountStorage(this.storage, accountID);
        const encryptedStorage = getSyncAccountStorage(this.encryptedStorage, accountID);
        const accountSecureEncryptedStorage = getSyncAccountStorage(
            secureEncryptedStorage,
            accountID
        );
        await initializeSyncAccount({
            storage,
            encryptedStorage,
            secureEncryptedStorage: accountSecureEncryptedStorage,
            versions: this.versions,
            masterKey,
            logger: this.syncContainerConfig.logger,
            crdtClock: this.syncContainerConfig.crdtClock
        });
        masterKey.fill(0);

        await this.syncAccountIDRepository.addAccount(accountID);

        const container = await createSyncContainer({
            accountId: accountID,
            versions: this.versions,
            storage,
            encryptedStorage,
            ...this.syncContainerConfig
        });

        await container.deviceManager.addDevice(
            container.ikService.getPub(),
            container.keyServiceFactory.createDmkSignerService(secureEncryptedStorage)
        );
        await container.deviceManager.activate();

        return new SyncAccount({
            accountId: accountID,
            structure: this.versions,
            syncProvider: new OfflineSyncProvider(container),
            container,
            syncAccountRepository: this.syncAccountIDRepository,
            online: false
        });
    }

    public async createOnlineAccountFromMasterKey(
        secureEncryptedStorage: ITreeStorage,
        payload: OnboardingMessagePayload,
        ik: { publicKey: Buffer; secretKey: Buffer },
        flow: SyncFlowLogger
    ) {
        const accountID = await generateAccountID(payload.masterKey);

        const accounts = await this.syncAccountIDRepository.getSyncAccounts();
        if (accounts.some(acc => acc.accountId === accountID)) {
            throw new AccountAlreadyExistsError();
        }

        const storage = getSyncAccountStorage(this.storage, accountID);
        const encryptedStorage = getSyncAccountStorage(this.encryptedStorage, accountID);
        const accountSecureEncryptedStorage = getSyncAccountStorage(
            secureEncryptedStorage,
            accountID
        );
        await initializeSyncAccount({
            storage,
            versions: this.versions,
            encryptedStorage: encryptedStorage,
            secureEncryptedStorage: accountSecureEncryptedStorage,
            masterKey: payload.masterKey,
            ik,
            logger: this.syncContainerConfig.logger,
            crdtClock: this.syncContainerConfig.crdtClock
        });
        payload.masterKey.fill(0);

        await this.syncAccountIDRepository.addAccount(accountID, true);
        flow.logStep('account_initialized');

        const container = await createSyncContainer({
            accountId: accountID,
            versions: this.versions,
            storage,
            encryptedStorage,
            ...this.syncContainerConfig
        });
        flow.logStep('container_initialized');

        await container.accountsApi.confirmOnboarding();
        flow.logStep('onboarded');

        const account = new SyncAccount({
            accountId: accountID,
            structure: this.versions,
            syncProvider: await OnlineSyncProvider.create(container),
            container,
            syncAccountRepository: this.syncAccountIDRepository,
            online: true
        });
        await account.syncProvider.syncStatusManager.waitForStatus(SyncStatus.SYNCHRONIZED);
        flow.logStep('synchronized');

        return account;
    }
}
