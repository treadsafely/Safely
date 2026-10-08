import { beforeEach, describe, expect, it } from 'vitest';

import { SyncStatus } from '../../src/sync-provider/sync-status';
import type { TestSyncAccount } from '../fixtures/account';
import { InMemStorage } from '../mocks/server-mock/storage';
import type { SyncServer } from '../mocks/server-mock/sync-server';
import { makeFactory } from '../mocks/server-mock/sync-server-factory';
import { initializeSyncServer } from '../mocks/server-mock/sync-server-registry';

type MockDevice = {
    account: TestSyncAccount;
    secureEncryptedStorage: InMemStorage;
};

describe('sync data not found', () => {
    let server: SyncServer;

    beforeEach(() => {
        server = initializeSyncServer();
    });

    it('sets sync data not found status when server sync data is dropped', async () => {
        const primary = await createDevice();
        await onboardDevice(primary);

        server.dropSyncData(primary.account.accountId);
        primary.account.syncProvider.restart();

        await primary.account.syncProvider.syncStatusManager.waitForStatus(
            SyncStatus.SYNC_DATA_NOT_FOUND
        );
        expect(primary.account.syncProvider.syncStatusManager.getStatus()).toBe(
            SyncStatus.SYNC_DATA_NOT_FOUND
        );
    });
});

async function createDevice(): Promise<MockDevice> {
    const secureEncryptedStorage = new InMemStorage();
    const account = await makeFactory().factory.createSyncAccount(secureEncryptedStorage);

    return { account, secureEncryptedStorage };
}

async function onboardDevice(existingDevice: MockDevice): Promise<MockDevice> {
    const secureEncryptedStorage = new InMemStorage();
    const connector =
        await makeFactory().factory.connectToExistingSyncAccount(secureEncryptedStorage);

    const [{ account }] = await Promise.all([
        connector.waitForCompletion(),
        existingDevice.account.connectToNewDevice(
            connector.data,
            existingDevice.secureEncryptedStorage
        )
    ]);

    await existingDevice.account.syncProvider.syncStatusManager.waitForStatus(
        SyncStatus.SYNCHRONIZED
    );
    await account.syncProvider.syncStatusManager.waitForStatus(SyncStatus.SYNCHRONIZED);

    return { account, secureEncryptedStorage };
}
