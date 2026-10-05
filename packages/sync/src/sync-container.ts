import type { AssertVersionHList, Clock, HCons, StorageVersion } from '@safely/slottree';

import { ApiSigner } from './api/api-signer';
import { AccountsApi, type Configuration, SnapshotsApi } from './api/generated';
import { SnapshotsSse } from './api/snapshots-sse';
import { CrdtController } from './crdt/crdt-controller';
import { CrdtManager } from './crdt/crdt-manager';
import { CrdtRepository } from './crdt/crdt-repository';
import { EncryptedKeyRepository } from './crypto/encrypted-key-repository';
import { DmkVerifierService } from './crypto/service/dmk-verifier-service';
import { IkService } from './crypto/service/ik-service';
import { KeyServiceFactory } from './crypto/service/key-service-factory';
import { SyncKeyService } from './crypto/service/sync-key-service';
import { DeviceManagementService } from './device-manager/device-management-service';
import { DeviceRepository } from './device-manager/device-repository';
import type { tDevicesLatest, tDevicesRest } from './device-manager/device-storage-schema';
import { DevicesVersions } from './device-manager/device-storage-schema';
import type { IStorage } from './I-storage';
import type { Logger } from './logger';
import { SecretEncryptor } from './secret-encryptor';
import { SnapshotSender } from './sync-operations/snapshot-sender';
import { SyncOperations } from './sync-operations/sync-operations';
import { UpdateDecryptorService } from './update-encryptor/update-decryptor-service';
import { UpdateEncryptorService } from './update-encryptor/update-encryptor-service';
import { UpdateHandler } from './update-handler/handler';
import { SyncStateRepository } from './update-handler/sync-state-repository';

export type SyncApiImplementations = {
    accountsApi: AccountsApi;
    snapshotsApi: SnapshotsApi;
    snapshotsSse: SnapshotsSse;
};

export type SyncApiImplementationsFactory = (requesterIk: Buffer) => SyncApiImplementations;

export type SyncContainer<Latest extends StorageVersion, Rest> = {
    versions: HCons<Latest, Rest> & AssertVersionHList<HCons<Latest, Rest>>;
    storage: IStorage;
    encryptedStorage: IStorage;
    logger: Logger;
    pollingTimeout: number;

    keyRepository: EncryptedKeyRepository;
    crdtRepository: CrdtRepository<Latest, Rest>;
    deviceCrdtRepository: CrdtRepository<tDevicesLatest, tDevicesRest>;
    syncStateRepository: SyncStateRepository;
    deviceRepository: DeviceRepository;

    keyServiceFactory: KeyServiceFactory;
    dmkVerifierService: DmkVerifierService;
    ikService: IkService;
    syncKeyService: SyncKeyService;

    updateEncryptor: UpdateEncryptorService;
    updateDecryptor: UpdateDecryptorService;
    updateHandler: UpdateHandler<Latest, Rest>;
    snapshotSender: SnapshotSender<Latest, Rest>;
    syncOperations: SyncOperations<Latest, Rest>;
    crdtController: CrdtController;

    yManager: CrdtManager<Latest, Rest>;
    deviceYManager: CrdtManager<tDevicesLatest, tDevicesRest>;
    deviceManager: DeviceManagementService;

    apiSigner: ApiSigner;
    accountsApi: AccountsApi;
    snapshotApi: SnapshotsApi;
    snapshotSse: SnapshotsSse;

    secretEncryptor: SecretEncryptor;
};

export type SyncContainerConfig = {
    logger: Logger;
    apiConfiguration?: Configuration;
    pollingTimeout: number;
    apiImplementationsFactory?: SyncApiImplementationsFactory;
    crdtClock?: Clock;
};

export async function createSyncContainer<Latest extends StorageVersion, Rest>(opts: {
    accountId: string;
    versions: HCons<Latest, Rest> & AssertVersionHList<HCons<Latest, Rest>>;
    storage: IStorage;
    encryptedStorage: IStorage;
    logger: Logger;
    apiConfiguration?: Configuration;
    pollingTimeout: number;
    apiImplementationsFactory?: SyncApiImplementationsFactory;
    crdtClock?: Clock;
}): Promise<SyncContainer<Latest, Rest>> {
    const keyRepository = await EncryptedKeyRepository.initialize(opts.encryptedStorage);
    const syncStateRepository = new SyncStateRepository(opts.storage, opts.logger);

    const ikService = new IkService(keyRepository);
    const syncKeyService = new SyncKeyService(keyRepository);
    const dmkVerifierService = new DmkVerifierService(keyRepository);
    const keyServiceFactory = new KeyServiceFactory(opts.accountId);

    const apiSigner = new ApiSigner(ikService);
    const apiImplementations = opts.apiImplementationsFactory?.(ikService.getPub());
    const accountsApi =
        apiImplementations?.accountsApi ?? new AccountsApi(apiSigner, opts.apiConfiguration);
    const snapshotsApi =
        apiImplementations?.snapshotsApi ?? new SnapshotsApi(apiSigner, opts.apiConfiguration);
    const snapshotSse =
        apiImplementations?.snapshotsSse ??
        new SnapshotsSse(syncStateRepository, snapshotsApi, apiSigner, opts.logger);

    const crdtRepository = new CrdtRepository(
        opts.storage,
        ikService.getPub(),
        opts.versions,
        'crdt',
        opts.crdtClock
    );
    const yManager = await CrdtManager.create(crdtRepository);
    const deviceCrdtRepository = new CrdtRepository<tDevicesLatest, tDevicesRest>(
        opts.storage,
        ikService.getPub(),
        DevicesVersions,
        'devices_crdt',
        opts.crdtClock
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
        opts.logger
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
        opts.logger
    );
    const snapshotSender = new SnapshotSender(
        updateEncryptor,
        yManager,
        deviceYManager,
        syncStateRepository,
        snapshotsApi,
        ikService
    );
    const syncOperations = new SyncOperations<Latest, Rest>(
        updateHandler,
        snapshotSender,
        deviceManager,
        crdtController
    );

    const secretEncryptor = new SecretEncryptor(keyServiceFactory);

    return {
        versions: opts.versions,
        logger: opts.logger,
        pollingTimeout: opts.pollingTimeout,
        dmkVerifierService,
        keyServiceFactory,
        storage: opts.storage,
        encryptedStorage: opts.encryptedStorage,
        keyRepository,
        syncStateRepository,
        crdtRepository,
        deviceCrdtRepository,
        deviceRepository,
        ikService,
        syncKeyService,
        updateEncryptor,
        updateDecryptor,
        updateHandler,
        snapshotSender,
        syncOperations,
        crdtController,
        yManager,
        deviceYManager,
        deviceManager,
        apiSigner,
        accountsApi,
        snapshotApi: snapshotsApi,
        snapshotSse,
        secretEncryptor
    };
}
