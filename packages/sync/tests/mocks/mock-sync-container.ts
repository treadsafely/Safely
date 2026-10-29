import type { AssertVersionHList, HCons, StorageVersion } from '@safely/slottree';

import type { MockSnapshotsServer } from './mock-snapshots-api';
import { MockSnapshotsApi, MockSnapshotsSse } from './mock-snapshots-api';
import { ApiSigner } from '../../src/api/api-signer';
import type { Configuration, SnapshotsApi } from '../../src/api/generated';
import { AccountsApi } from '../../src/api/generated';
import { CrdtController } from '../../src/crdt/crdt-controller';
import { CrdtManager } from '../../src/crdt/crdt-manager';
import { CrdtRepository } from '../../src/crdt/crdt-repository';
import { EncryptedKeyRepository } from '../../src/crypto/encrypted-key-repository';
import { DmkVerifierService } from '../../src/crypto/service/dmk-verifier-service';
import { IkService } from '../../src/crypto/service/ik-service';
import { KeyServiceFactory } from '../../src/crypto/service/key-service-factory';
import { SyncKeyService } from '../../src/crypto/service/sync-key-service';
import { DeviceManagementService } from '../../src/device-manager/device-management-service';
import { DeviceRepository } from '../../src/device-manager/device-repository';
import type { tDevicesLatest, tDevicesRest } from '../../src/device-manager/device-storage-schema';
import { DevicesVersions } from '../../src/device-manager/device-storage-schema';
import type { ITreeStorage } from '../../src/I-storage';
import type { Logger } from '../../src/logger/logger';
import { SecureSecretEncryptor } from '../../src/secret-encryptor';
import type { SyncContainer } from '../../src/sync-container';
import { SnapshotSender } from '../../src/sync-operations/snapshot-sender';
import { SyncOperations } from '../../src/sync-operations/sync-operations';
import { UpdateDecryptorService } from '../../src/update-encryptor/update-decryptor-service';
import { UpdateEncryptorService } from '../../src/update-encryptor/update-encryptor-service';
import { UpdateHandler } from '../../src/update-handler/handler';
import { SyncStateRepository } from '../../src/update-handler/sync-state-repository';

export type MockSyncContainer<Latest extends StorageVersion, Rest> = Omit<
    SyncContainer<Latest, Rest>,
    'snapshotApi' | 'snapshotSse'
> & {
    snapshotApi: MockSnapshotsApi;
    snapshotSse: MockSnapshotsSse;
};

export async function createMockSyncContainer<Latest extends StorageVersion, Rest>(
    storage: ITreeStorage,
    encryptedStorage: ITreeStorage,
    server: MockSnapshotsServer,
    accountId: string,
    logger: Logger,
    versions: HCons<Latest, Rest> & AssertVersionHList<HCons<Latest, Rest>>,
    apiConfiguration?: Configuration,
    pollingTimeout = 500
): Promise<MockSyncContainer<Latest, Rest>> {
    const keyRepository = await EncryptedKeyRepository.initialize(encryptedStorage);
    const syncStateRepository = new SyncStateRepository(storage, logger);

    const ikService = new IkService(keyRepository);
    const syncKeyService = new SyncKeyService(keyRepository);
    const dmkVerifierService = new DmkVerifierService(keyRepository);
    const keyServiceFactory = new KeyServiceFactory(accountId);

    const apiSigner = new ApiSigner(ikService);
    const accountsApi = new AccountsApi(apiSigner, apiConfiguration);
    const snapshotApi = new MockSnapshotsApi(server);
    const snapshotSse = new MockSnapshotsSse(server);

    const crdtRepository = new CrdtRepository(storage, ikService.getPub(), versions);
    const yManager = await CrdtManager.create(crdtRepository);
    const deviceCrdtRepository = new CrdtRepository<tDevicesLatest, tDevicesRest>(
        storage,
        ikService.getPub(),
        DevicesVersions,
        'devices_crdt'
    );
    const deviceYManager = await CrdtManager.create<tDevicesLatest, tDevicesRest>(
        deviceCrdtRepository
    );
    const crdtController = new CrdtController(yManager, deviceYManager);

    const deviceRepository = new DeviceRepository(deviceYManager);
    const deviceManager = new DeviceManagementService(
        deviceRepository,
        ikService,
        dmkVerifierService,
        logger
    );
    await deviceManager.cleanupStaleAddedDevices();

    const updateEncryptor = new UpdateEncryptorService(
        syncKeyService,
        ikService,
        syncStateRepository
    );
    const updateDecryptor = new UpdateDecryptorService(syncKeyService);

    const updateHandler = new UpdateHandler<Latest, Rest>(
        syncStateRepository,
        yManager,
        deviceYManager,
        updateDecryptor,
        deviceManager,
        logger
    );
    const snapshotSender = new SnapshotSender(
        updateEncryptor,
        yManager,
        deviceYManager,
        syncStateRepository,
        snapshotApi as unknown as SnapshotsApi,
        ikService
    );
    const syncOperations = new SyncOperations<Latest, Rest>(
        updateHandler,
        snapshotSender,
        deviceManager,
        crdtController
    );

    const secureSecretEncryptor = new SecureSecretEncryptor(keyServiceFactory);

    return {
        versions,
        logger,
        pollingTimeout,
        storage,
        encryptedStorage,
        keyRepository,
        syncStateRepository,
        crdtRepository,
        deviceCrdtRepository,
        deviceRepository,
        ikService,
        syncKeyService,
        keyServiceFactory,
        updateEncryptor,
        updateDecryptor,
        updateHandler,
        snapshotSender,
        syncOperations,
        crdtController,
        yManager,
        deviceYManager,
        deviceManager,
        dmkVerifierService,
        apiSigner,
        accountsApi,
        snapshotApi,
        snapshotSse,
        secureSecretEncryptor
    };
}
