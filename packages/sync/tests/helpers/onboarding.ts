import { waitForNextSynchronizationCycle, waitWithTimeout } from './synchronization';
import { SyncStatus } from '../../src/sync-provider/sync-status';
import type { TestSyncAccount } from '../fixtures/account';
import type { InMemStorage } from '../mocks/server-mock/storage';
import type { MockSyncAccountFactory } from '../mocks/server-mock/sync-server-factory';

export async function onboardMockAccount(
    existingAccount: TestSyncAccount,
    existingSecureEncryptedStorage: InMemStorage,
    newFactory: MockSyncAccountFactory,
    newSecureEncryptedStorage: InMemStorage
): Promise<TestSyncAccount> {
    const connector =
        await newFactory.factory.connectToExistingSyncAccount(newSecureEncryptedStorage);

    const connectExistingAccount = waitForNextSynchronizationCycle(
        existingAccount,
        'new device addition synchronized',
        () => existingAccount.connectToNewDevice(connector.data, existingSecureEncryptedStorage)
    );
    const [, onboarded] = await waitWithTimeout(
        Promise.all([connectExistingAccount, connector.waitForCompletion()]),
        'mock device onboarding'
    );
    const newAccount = onboarded.account;

    await waitWithTimeout(
        newAccount.syncProvider.syncStatusManager.waitForStatus(SyncStatus.SYNCHRONIZED),
        'new device synchronized'
    );

    return newAccount;
}
