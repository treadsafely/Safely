import { x25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createStorage, defineVersionHList, hCons, hNil, projectIdentity } from '@safely/slottree';

import { AccountManager } from '../../src/account/account-manager';
import { CreateAccountService } from '../../src/account/create-account-service';
import { SyncAccountRepository } from '../../src/account/sync-account-repository';
import { getSyncAccountStorage } from '../../src/account/sync-account-storage';
import { Configuration } from '../../src/api/generated';
import { ed25519_keygen } from '../../src/crypto/ed25519';
import { DevicesVersions } from '../../src/device-manager/device-storage-schema';
import { generateAccountID, generateMasterKey, initializeSyncAccount } from '../../src/initialize';
import { Logger } from '../../src/logger/logger';
import { SyncFlowLogger } from '../../src/logger/sync-flow-logger';
import { QRMessageCodec, QRMessageOperation } from '../../src/onboarding/onboarding-codec';
import type { SyncContainerConfig } from '../../src/sync-container';
import { InMemStorage } from '../mocks/server-mock/storage';
import { SyncServer } from '../mocks/server-mock/sync-server';
import { createSyncServerApiImplementations } from '../mocks/server-mock/sync-server-api-implementations';

const AccountSchema = z.object({ value: z.string() });

const AccountV1 = {
    version: 1,
    schema: AccountSchema,
    initial: { value: '' },
    projectUp: projectIdentity,
    projectDown: projectIdentity
} as const;

const AccountV2 = {
    version: 2,
    schema: AccountSchema,
    initial: { value: '' },
    projectUp: projectIdentity,
    projectDown: projectIdentity
} as const;

const knownVersions = defineVersionHList(hCons(AccountV1, hNil));
const futureVersions = defineVersionHList(hCons(AccountV2, hCons(AccountV1, hNil)));

async function createInitializedAccountManager(server = new SyncServer()) {
    const storage = new InMemStorage();
    const encryptedStorage = new InMemStorage();
    const secureEncryptedStorage = new InMemStorage();
    const repository = new SyncAccountRepository(storage);
    const logger = new Logger({ log: () => {} });
    const masterKey = await generateMasterKey();
    const accountId = await generateAccountID(masterKey);
    const accountStorage = getSyncAccountStorage(storage, accountId);

    await initializeSyncAccount({
        storage: accountStorage,
        encryptedStorage: getSyncAccountStorage(encryptedStorage, accountId),
        secureEncryptedStorage: getSyncAccountStorage(secureEncryptedStorage, accountId),
        versions: knownVersions,
        masterKey,
        logger
    });
    await repository.addAccount(accountId);

    const apiConfiguration = new Configuration({ basePath: 'mock://sync' });
    const apiImplementationsFactory = (requesterIk: Buffer) =>
        createSyncServerApiImplementations(server, requesterIk);
    const syncContainerConfig: SyncContainerConfig = {
        logger,
        apiConfiguration,
        pollingTimeout: 1,
        apiImplementationsFactory
    };
    const createAccountService = new CreateAccountService(
        storage,
        encryptedStorage,
        repository,
        knownVersions,
        syncContainerConfig
    );
    const manager = new AccountManager(
        storage,
        encryptedStorage,
        repository,
        knownVersions,
        createAccountService,
        syncContainerConfig
    );

    return {
        accountId,
        accountStorage,
        manager,
        masterKey,
        secureEncryptedStorage,
        logger
    };
}

describe('AccountManager', () => {
    it('creates an offline account and adds it to the account list', async () => {
        const { manager, secureEncryptedStorage } = await createInitializedAccountManager();

        const created = await manager.createOfflineAccount(secureEncryptedStorage);

        expect(created.accountId).toBeTruthy();
        expect(await manager.getAccounts()).toContain(created);
    });

    it('creates an online account from a master key and adds it to the account list', async () => {
        const server = new SyncServer();
        const primary = await createInitializedAccountManager(server);
        const target = await createInitializedAccountManager(server);
        const primaryAccount = await primary.manager.getSyncAccount(primary.accountId);
        const ik = ed25519_keygen();
        const ephemeral = x25519.keygen();
        const onboardingData = QRMessageCodec.encode({
            type: QRMessageOperation.NEW_DEVICE_ONBOARDING,
            ephemeralPub: Buffer.from(ephemeral.publicKey),
            ikPub: ik.publicKey,
            storageVersion: knownVersions.head.version,
            devicesStorageVersion: DevicesVersions.head.version
        });
        const primaryOnboarding = primaryAccount.connectToNewDevice(
            onboardingData,
            primary.secureEncryptedStorage
        );
        await server.waitForOnboardingMessage(ik.publicKey.toString('hex'), {
            timeoutMs: 1000
        });
        const payload = { masterKey: Buffer.from(primary.masterKey), inviterIkPub: null };
        const flow = new SyncFlowLogger(target.logger, 'test.account.create');

        const created = await target.manager.createOnlineAccountFromMasterKey(
            target.secureEncryptedStorage,
            payload,
            ik,
            flow
        );
        await primaryOnboarding;

        expect(created.accountId).toBe(primary.accountId);
        expect(await target.manager.getAccounts()).toContain(created);

        primaryAccount.syncProvider.dispose();
        created.syncProvider.dispose();
    });

    it('returns the same account instance for concurrent getSyncAccount calls', async () => {
        const { accountId, manager } = await createInitializedAccountManager();

        const [first, second] = await Promise.all([
            manager.getSyncAccount(accountId),
            manager.getSyncAccount(accountId)
        ]);

        expect(first).toBe(second);
    });

    it('exposes newer storage versions on the sync provider without failing account load', async () => {
        const { accountId, accountStorage, manager } = await createInitializedAccountManager();

        const futureStorage = createStorage({
            authorId: Buffer.from('future-device'),
            versions: futureVersions
        });
        await accountStorage.setItem('crdt', futureStorage.export().toString('base64url'));

        const account = await manager.getSyncAccount(accountId);

        expect(account.syncProvider.hasNewerStorageVersions).toBe(true);
        expect(account.syncProvider.getAll()).toEqual({ value: '' });
    });
});
