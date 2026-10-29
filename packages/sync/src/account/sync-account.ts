import type { AssertVersionHList, HCons, NewOf, StorageVersion } from '@safely/slottree';

import type { ISyncAccount } from './I-sync-account';
import type { SyncAccountRepository } from './sync-account-repository';
import type { MKDerivationDomain } from '../crypto/service/master-key-service';
import type { Device } from '../device-manager/device-repository';
import { DevicesVersions } from '../device-manager/device-storage-schema';
import type { ITreeStorage } from '../I-storage';
import type { SyncFlowLogger } from '../logger';
import { withSyncFlow } from '../logger';
import type { OnboardingConnector } from '../onboarding/connector';
import { PrimaryDeviceOnboarding } from '../onboarding/primary-device-onboarding';
import { ReconnectOnboardingCoordinator } from '../onboarding/reconnect/reconnect-onboarding-coordinator';
import type { IVaultSecretEncryptor } from '../secret-encryptor';
import type { SyncContainer } from '../sync-container';
import type { ISyncProvider } from '../sync-provider/I-sync-provider';
import { OnlineSyncProvider } from '../sync-provider/online-sync-provider';
import type { SyncStatusManager } from '../sync-provider/sync-status';
import { SyncStatus } from '../sync-provider/sync-status';

export class SyncAccount<Latest extends StorageVersion, Rest> implements ISyncAccount<Latest> {
    public readonly secureSecretEncryptor: IVaultSecretEncryptor;
    public readonly accountId: string;

    private readonly structure: HCons<Latest, Rest> & AssertVersionHList<HCons<Latest, Rest>>;
    private readonly container: SyncContainer<Latest, Rest>;
    private readonly syncAccountRepository: SyncAccountRepository;
    private readonly reconnectOnboardingCoordinator: ReconnectOnboardingCoordinator<Latest, Rest>;

    private online: boolean;
    private syncProviderInternal: ISyncProvider<NewOf<Latest>>;
    private makeAccountOnlinePromise: Promise<void> | null = null;

    constructor(opts: {
        accountId: string;
        structure: HCons<Latest, Rest> & AssertVersionHList<HCons<Latest, Rest>>;
        syncProvider: ISyncProvider<NewOf<Latest>>;
        container: SyncContainer<Latest, Rest>;
        syncAccountRepository: SyncAccountRepository;
        online: boolean;
    }) {
        this.accountId = opts.accountId;
        this.structure = opts.structure;
        this.container = opts.container;
        this.syncAccountRepository = opts.syncAccountRepository;
        this.syncProviderInternal = opts.syncProvider;
        this.online = opts.online;
        this.secureSecretEncryptor = opts.container.secureSecretEncryptor;
        this.reconnectOnboardingCoordinator = new ReconnectOnboardingCoordinator(
            this,
            () => this.syncProviderInternal,
            opts.container.ikService,
            opts.container.deviceManager,
            opts.container.logger,
            opts.container.pollingTimeout,
            this.structure.head.version,
            DevicesVersions.head.version
        );
    }

    public get syncProvider(): ISyncProvider<NewOf<Latest>> {
        return this.syncProviderInternal;
    }

    public async connectToNewDevice(
        data: Buffer,
        secureEncryptedStorage: ITreeStorage
    ): Promise<{ newDeviceIkPub: Buffer }> {
        return await withSyncFlow(
            this.container.logger,
            'account.connect_to_new_device',
            {},
            async flow => {
                return await this.connectToNewDeviceWithLogger(data, secureEncryptedStorage, flow);
            }
        );
    }

    private async connectToNewDeviceWithLogger(
        data: Buffer,
        secureEncryptedStorage: ITreeStorage,
        flow: SyncFlowLogger
    ): Promise<{ newDeviceIkPub: Buffer }> {
        await this.ensureAccountOnline();
        flow.logStep('ensure_online.done');

        const onboarding = new PrimaryDeviceOnboarding(
            this.container.ikService.getPub(),
            this.container.keyServiceFactory.createMasterKeyService(secureEncryptedStorage),
            this.container.keyServiceFactory.createDmkSignerService(secureEncryptedStorage),
            this.container.accountsApi,
            this.container.deviceManager,
            this.container.syncOperations,
            this.structure.head.version,
            DevicesVersions.head.version,
            async () => {
                this.syncProvider.triggerSync();
                await this.syncProvider.syncStatusManager.waitForStatus(SyncStatus.SYNCHRONIZED);
            }
        );
        const { newDeviceIkPub } = await onboarding.onboard(data, flow.child('onboarding.primary'));
        flow.logEnd('onboarding.completed');

        return { newDeviceIkPub };
    }

    public async getDevices(): Promise<Device[]> {
        return await this.container.deviceManager.getDevices();
    }

    public async revokeRemoteDevice(
        ikPub: Buffer,
        secureEncryptedStorage: ITreeStorage
    ): Promise<void> {
        const myIkPub = this.container.ikService.getPub();
        if (ikPub.equals(myIkPub)) {
            throw new Error(
                'Cannot revoke self device with revokeRemoteDevice, use SyncAccountFactory.deleteLocalAccount instead'
            );
        }
        await this.container.syncOperations.revokeDevice(
            ikPub,
            this.container.keyServiceFactory.createDmkSignerService(secureEncryptedStorage)
        );
        this.syncProvider.triggerSync();
        const sig = await this.container.keyServiceFactory
            .createDmkSignerService(secureEncryptedStorage)
            .signRevokeDeviceForServer(ikPub);
        await this.container.accountsApi.removeDeviceFromAccount({
            signedDeviceIdentity: {
                identityPubKey: ikPub.toString('hex'),
                signature: sig.toString('hex')
            }
        });
    }

    public async reconnectToAccount(): Promise<OnboardingConnector<Latest>> {
        return await this.reconnectOnboardingCoordinator.getConnector();
    }

    public getMyDeviceIkPub(): Buffer {
        return this.container.ikService.getPub();
    }

    public async deriveKeyFromMasterKey(
        domain: MKDerivationDomain,
        secureEncryptedStorage: ITreeStorage
    ): Promise<Buffer> {
        return await this.container.keyServiceFactory
            .createMasterKeyService(secureEncryptedStorage)
            .deriveKey(domain);
    }

    public async deleteThisDevice(secureEncryptedStorage: ITreeStorage): Promise<void> {
        this.syncProvider.dispose();

        // Revoke self device in doc
        const myIkPub = this.container.ikService.getPub();
        await this.container.syncOperations.revokeDevice(
            myIkPub,
            this.container.keyServiceFactory.createDmkSignerService(secureEncryptedStorage)
        );

        // Send manually new snapshot to the server so that the revoke operation is synced on
        // the other devices.
        for (let i = 0; i < 3; i++) {
            try {
                await this.sendSnapshotManually();
                break;
            } catch (error) {
                this.container.logger.warn(
                    'Cannot send snapshot to server after revoking self device',
                    error
                );
            }
        }

        try {
            const sig = await this.container.keyServiceFactory
                .createDmkSignerService(secureEncryptedStorage)
                .signRevokeDeviceForServer(myIkPub);
            await this.container.accountsApi.removeDeviceFromAccount({
                signedDeviceIdentity: {
                    identityPubKey: myIkPub.toString('hex'),
                    signature: sig.toString('hex')
                }
            });
        } catch (error) {
            this.container.logger.warn('Cannot revoke self device on server', error);
        }
    }

    private async ensureAccountOnline(): Promise<void> {
        if (this.online) {
            return;
        }

        if (!this.makeAccountOnlinePromise) {
            this.makeAccountOnlinePromise = this.makeAccountOnline().finally(() => {
                this.makeAccountOnlinePromise = null;
            });
        }

        await this.makeAccountOnlinePromise;
    }

    private async makeAccountOnline(): Promise<void> {
        const keyRepository = this.container.keyRepository;
        const dmkPub = keyRepository.getDMKPub();
        const ikPub = keyRepository.getIKPub();

        await this.container.accountsApi.createAccount({
            newAccount: {
                accountId: this.accountId,
                deviceManagementPubKey: dmkPub.toString('hex'),
                identityPubKey: ikPub.toString('hex')
            }
        });
        await this.sendSnapshotManually();

        await this.syncAccountRepository.setAccountOnlineStatus(this.accountId, true);

        await this.promoteToOnlineProvider();
        this.online = true;
    }

    private async promoteToOnlineProvider(): Promise<void> {
        if (this.syncProviderInternal.syncStatusManager.getStatus() !== SyncStatus.OFFLINE) {
            return;
        }

        this.syncProviderInternal.dispose();
        this.syncProviderInternal = await OnlineSyncProvider.create(
            this.container,
            // We pass the same SyncStatusManager instance to the OnlineSyncProvider, so that the
            // subscribers to the SyncAccount's syncProvider will be notified of the status changes
            // when we promote to online provider.
            this.syncProviderInternal.syncStatusManager as SyncStatusManager
        );
    }

    private async sendSnapshotManually(): Promise<void> {
        await this.container.syncOperations.pushLocalSnapshot();
    }
}
