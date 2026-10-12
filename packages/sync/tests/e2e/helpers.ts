import { SyncAccountFactory } from '../../src';
import { SyncAccount } from '../../src/account/sync-account';
import { Logger } from '../../src/logger/logger';
import type { TestSyncAccount, TestSyncAccountFactory } from '../fixtures/account';
import { Versions } from '../fixtures/account';
import { InMemStorage } from '../mocks/server-mock/storage';

let accountCounter = 0;

export function makeFactory(): TestSyncAccountFactory {
    const storage = new InMemStorage();
    const encryptedStorage = new InMemStorage();
    const apiConfiguration = {
        basePath: 'https://dev-sync.safely.app'
    };
    const factoryId = accountCounter++;

    return new SyncAccountFactory({
        storage,
        encryptedStorage,
        versions: Versions,
        apiConfiguration,
        pollingTimeout: 500,
        logger: new Logger().child(`${factoryId}`)
    });
}

export async function onboardDevice(
    existingAccount: TestSyncAccount,
    existingAccountSecureEncryptedStorage: InMemStorage
) {
    const secureEncryptedStorage = new InMemStorage();

    const factoryDevice2 = makeFactory();
    const onboardingConnector =
        await factoryDevice2.connectToExistingSyncAccount(secureEncryptedStorage);
    const promise1 = existingAccount.connectToNewDevice(
        onboardingConnector.data,
        existingAccountSecureEncryptedStorage
    );
    const promise2 = onboardingConnector.waitForCompletion();
    const [{ newDeviceIkPub }, onboarded] = await Promise.all([promise1, promise2]);
    return {
        newAccount: onboarded.account,
        newDeviceIkPub,
        inviterIkPub: onboarded.inviterIkPub,
        secureEncryptedStorage
    };
}

// Unlike factory.deleteLocalAccount, keeps the local keys, so the device can still reconnect
export async function deleteThisDevice(
    account: TestSyncAccount,
    secureEncryptedStorage: InMemStorage
): Promise<void> {
    if (!(account instanceof SyncAccount)) {
        throw new Error('Expected an online SyncAccount');
    }
    await account.deleteThisDevice(secureEncryptedStorage);
    account.syncProvider.restart();
}
