import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeFactory, onboardDevice } from './helpers';
import { SyncStatus } from '../../src/sync-provider/sync-status';
import { InMemStorage } from '../mocks/server-mock/storage';

describe('Account', { timeout: 10_000 }, () => {
    let factory: ReturnType<typeof makeFactory>;
    let secureEncryptedStorage: InMemStorage;

    beforeEach(async () => {
        factory = makeFactory();
        secureEncryptedStorage = new InMemStorage();
    });

    it('create account', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);

        const devices = await account.getDevices();
        expect(devices).toHaveLength(1);
    });

    it('makes account online', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        await onboardDevice(account, secureEncryptedStorage);
    });

    it('should sync data with server', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        await onboardDevice(account, secureEncryptedStorage);

        await account.syncProvider.transaction(draft => {
            draft.set('wallets', walletItems('wallet'));
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should onboard new device', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        const { newAccount } = await onboardDevice(account, secureEncryptedStorage);

        await account.syncProvider.transaction(draft => {
            draft.set('wallets', walletItems('wallet'));
        });

        await vi.waitFor(async () => {
            const wallets = newAccount.syncProvider.get('wallets');
            expect(wallets).toEqual(walletItems('wallet'));
        });

        await newAccount.syncProvider.transaction(draft => {
            draft.set('wallets', walletItems('wallet2'));
        });

        await vi.waitFor(async () => {
            const wallets = account.syncProvider.get('wallets');
            expect(wallets).toEqual(walletItems('wallet2'));
        });
    });

    it('should reconnect and accept update after reconnect', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        const { newAccount } = await onboardDevice(account, secureEncryptedStorage);

        await account.syncProvider.transaction(draft => {
            draft.set('wallets', walletItems('wallet'));
        });

        await vi.waitFor(async () => {
            const wallets = newAccount.syncProvider.get('wallets');
            expect(wallets).toEqual(walletItems('wallet'));
        });

        account.syncProvider.restart();
        await account.syncProvider.syncStatusManager.waitForStatus(SyncStatus.SYNCHRONIZED);

        await account.syncProvider.transaction(draft => {
            draft.set('wallets', walletItems('wallet2'));
        });

        await vi.waitFor(async () => {
            const wallets = newAccount.syncProvider.get('wallets');
            expect(wallets).toEqual(walletItems('wallet2'));
        });
    });

    it('should delete offline account', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        await factory.deleteLocalAccount(account.accountId, secureEncryptedStorage);

        const accounts = await factory.getSyncAccounts();
        expect(accounts).toHaveLength(0);
    });

    it('should delete online account', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        await onboardDevice(account, secureEncryptedStorage);
        await new Promise(resolve => setTimeout(resolve, 200));

        await factory.deleteLocalAccount(account.accountId, secureEncryptedStorage);

        const accounts = await factory.getSyncAccounts();
        expect(accounts).toHaveLength(0);
    });

    describe('errors', () => {
        it('should throw when onboarding existing account on new device', async () => {
            const account = await factory.createSyncAccount(secureEncryptedStorage);
            const { newAccount, secureEncryptedStorage: newAccountSES } = await onboardDevice(
                account,
                secureEncryptedStorage
            );

            const connector = await factory.connectToExistingSyncAccount(secureEncryptedStorage);
            const promise = newAccount.connectToNewDevice(connector.data, newAccountSES);

            await expect(
                Promise.all([connector.waitForCompletion(), promise])
            ).rejects.toThrowError('Account already exists');
        }, 7000);
    });
});

function walletItems(...values: string[]) {
    return values.map(value => ({
        __setId: value,
        value
    }));
}
