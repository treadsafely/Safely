import { SyncAccountFactory } from '../../src';
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
