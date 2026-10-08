import type { AssertVersionHList, Clock, HCons, StorageVersion } from '@safely/slottree';

import { AccountManager } from './account-manager';
import type { ISyncAccount } from './I-sync-account';
import type { ISyncAccountFactory } from './I-sync-account-factory';
import type { ITreeStorage } from '../I-storage';
import { CreateAccountService } from './create-account-service';
import { SyncAccountRepository } from './sync-account-repository';
import { Configuration } from '../api/generated';
import type { SyncApiConfiguration } from '../api/sync-api-configuration';
import { ed25519_keygen } from '../crypto/ed25519';
import { DevicesVersions } from '../device-manager/device-storage-schema';
import type { Logger } from '../logger';
import type { OnboardingConnector } from '../onboarding/connector';
import { accountsApiForOnboarding, NewDeviceOnboarding } from '../onboarding/new-device-onboarding';
import { SingleActiveOnboardingCoordinator } from '../onboarding/single-active-onboarding-coordinator';
import type { SyncApiImplementationsFactory, SyncContainerConfig } from '../sync-container';

type VersionHList = HCons<StorageVersion, unknown>;
type LatestOf<Versions extends VersionHList> = Versions['head'];
type RestOf<Versions extends VersionHList> = Versions['tail'];

export type SyncAccountFactoryOptions<Versions extends VersionHList> = {
    storage: ITreeStorage;
    encryptedStorage: ITreeStorage;
    versions: Versions & AssertVersionHList<Versions>;
    apiConfiguration?: SyncApiConfiguration;
    apiImplementationsFactory?: SyncApiImplementationsFactory;
    pollingTimeout?: number;
    logger: Logger;
    crdtClock?: Clock;
};

export class SyncAccountFactory<Versions extends VersionHList> implements ISyncAccountFactory<
    LatestOf<Versions>
> {
    private readonly syncAccountIdRepository: SyncAccountRepository;
    private readonly accountManager: AccountManager<LatestOf<Versions>, RestOf<Versions>>;
    private readonly apiConfiguration: Configuration;
    private readonly apiImplementationsFactory?: SyncApiImplementationsFactory;
    private readonly logger: Logger;
    private readonly pollingTimeout: number;
    private readonly storageVersion: number;
    private readonly connectToExistingAccountCoordinator = new SingleActiveOnboardingCoordinator<
        LatestOf<Versions>
    >();

    constructor(opts: SyncAccountFactoryOptions<Versions>) {
        this.syncAccountIdRepository = new SyncAccountRepository(opts.storage);
        this.apiConfiguration = new Configuration(opts.apiConfiguration);
        this.apiImplementationsFactory = opts.apiImplementationsFactory;
        this.logger = opts.logger;
        this.pollingTimeout = opts.pollingTimeout ?? 2000;

        const syncContainerConfig: SyncContainerConfig = {
            logger: this.logger,
            apiConfiguration: this.apiConfiguration,
            pollingTimeout: this.pollingTimeout,
            apiImplementationsFactory: this.apiImplementationsFactory,
            crdtClock: opts.crdtClock
        };

        const createAccountService = new CreateAccountService(
            opts.storage,
            opts.encryptedStorage,
            this.syncAccountIdRepository,
            opts.versions,
            syncContainerConfig
        );
        this.accountManager = new AccountManager(
            opts.storage,
            opts.encryptedStorage,
            this.syncAccountIdRepository,
            opts.versions,
            createAccountService,
            syncContainerConfig
        );
        this.storageVersion = opts.versions.head.version;
    }

    /**
     * Initiates the process of connecting to an existing sync account.
     * This method returns an OnboardingConnector which contains the data needed for onboarding and
     * a method to wait for the completion of the onboarding process.
     */
    public async connectToExistingSyncAccount(
        secureEncryptedStorage: ITreeStorage
    ): Promise<OnboardingConnector<LatestOf<Versions>>> {
        return await this.connectToExistingAccountCoordinator.getConnector(() =>
            this.createConnectToExistingAccountSession(secureEncryptedStorage)
        );
    }

    private async createConnectToExistingAccountSession(secureEncryptedStorage: ITreeStorage) {
        const ikKeypair = ed25519_keygen();
        const accountsApi =
            this.apiImplementationsFactory?.(ikKeypair.publicKey).accountsApi ??
            accountsApiForOnboarding(ikKeypair, this.apiConfiguration);
        const onboarding = new NewDeviceOnboarding(
            ikKeypair,
            accountsApi,
            this.accountManager,
            secureEncryptedStorage,
            this.logger,
            this.pollingTimeout,
            this.storageVersion,
            DevicesVersions.head.version
        );

        return {
            data: onboarding.generateOnboardingData(),
            waitForCompletion: (signal: AbortSignal) => onboarding.waitForOnboarding(signal)
        };
    }

    /**
     * Creates a new offline sync account. The account will be stored locally and can be made online later.
     */
    public async createSyncAccount(
        secureEncryptedStorage: ITreeStorage
    ): Promise<ISyncAccount<LatestOf<Versions>>> {
        return await this.accountManager.createOfflineAccount(secureEncryptedStorage);
    }

    /**
     * Returns a list of all sync accounts available. This includes both online and offline accounts.
     */
    public async getSyncAccounts(): Promise<ISyncAccount<LatestOf<Versions>>[]> {
        return await this.accountManager.getAccounts();
    }

    /**
     * Returns the sync account with the specified account ID.
     * @param accountId
     */
    public async getSyncAccount(accountId: string): Promise<ISyncAccount<LatestOf<Versions>>> {
        return await this.accountManager.getSyncAccount(accountId);
    }

    /**
     * 1. Revokes the device from the account and sends new snapshot to the server (skip if API call fails)
     * 2. Revokes the device from the server (skip if API call fails)
     * 3. Deletes the account data from local storage
     * @param accountId
     */
    public async deleteLocalAccount(
        accountId: string,
        secureEncryptedStorage: ITreeStorage
    ): Promise<void> {
        await this.accountManager.deleteAccount(accountId, secureEncryptedStorage);
    }
}
