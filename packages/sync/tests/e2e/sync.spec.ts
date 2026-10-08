import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeFactory, onboardDevice } from './helpers';
import { SyncStatus } from '../../src';
import type { TestSyncAccount, TestSyncAccountFactory } from '../fixtures/account';
import { InMemStorage } from '../mocks/server-mock/storage';

type WalletItem = {
    __setId: string;
    value: string;
};

describe('Sync', { timeout: 10_000 }, () => {
    let factory: TestSyncAccountFactory;
    let secureEncryptedStorage: InMemStorage;
    let accounts: TestSyncAccount[];

    beforeEach(async () => {
        factory = makeFactory();
        secureEncryptedStorage = new InMemStorage();
        accounts = [];
    });

    async function setAndVerify(account: TestSyncAccount, data: WalletItem[]) {
        await account.syncProvider.transaction(draft => {
            draft.set('wallets', data);
        });
        await account.syncProvider.syncStatusManager.waitForStatus(SyncStatus.SYNCHRONIZED);
        await vi.waitFor(
            async () => {
                // checks if all accounts synchronized
                for (const acc of accounts) {
                    const wallets = acc.syncProvider.get('wallets');
                    expect(wallets).toEqual(data);
                }
            },
            { timeout: 10000 }
        );
    }

    async function updateAndVerify(account: TestSyncAccount, data: WalletItem[]) {
        await account.syncProvider.transaction(draft => {
            draft.set('wallets', data);
        });
        await vi.waitFor(
            async () => {
                // checks if all accounts synchronized
                for (const acc of accounts) {
                    const wallets = acc.syncProvider.get('wallets');
                    expect(wallets).toEqual(data);
                }
            },
            { timeout: 10000 }
        );
    }

    it('should sync 2 devices', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        const { newAccount } = await onboardDevice(account, secureEncryptedStorage);

        accounts.push(account);
        accounts.push(newAccount);

        await setAndVerify(account, walletItems('wallet1'));
        await setAndVerify(newAccount, walletItems('wallet1', 'wallet2'));
        await setAndVerify(account, walletItems('wallet2', 'wallet3'));
        await setAndVerify(newAccount, walletItems('wallet4'));

        account.syncProvider.restart();
        newAccount.syncProvider.restart();

        await setAndVerify(account, walletItems('wallet5'));
        await setAndVerify(account, walletItems('wallet6'));
        await setAndVerify(newAccount, walletItems('wallet7'));
        await setAndVerify(account, walletItems('wallet8'));
    }, 10000);

    it('should sync local update mutations', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        const { newAccount } = await onboardDevice(account, secureEncryptedStorage);

        accounts.push(account);
        accounts.push(newAccount);

        await updateAndVerify(account, walletItems('wallet1'));
        await updateAndVerify(newAccount, walletItems('wallet1', 'wallet2'));
    }, 10000);

    it('should sync 3 devices', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        const { newAccount: account2 } = await onboardDevice(account, secureEncryptedStorage);
        const { newAccount: account3 } = await onboardDevice(account, secureEncryptedStorage);

        accounts.push(account);
        accounts.push(account2);
        accounts.push(account3);

        await setAndVerify(account, walletItems('wallet1'));
        await setAndVerify(account2, walletItems('wallet1', 'wallet2'));
        await setAndVerify(account3, walletItems('wallet1', 'wallet2', 'wallet3'));
    }, 10000);

    it('should sync device list when 1 device is onboarded', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        const { newAccount: account2 } = await onboardDevice(account, secureEncryptedStorage);

        accounts.push(account);
        accounts.push(account2);

        await vi.waitFor(async () => {
            const devices1 = await account.getDevices();
            const devices2 = await account2.getDevices();

            expect(devices1).toHaveLength(2);
            expect(devices1).toEqual(devices2);
        });
    }, 10000);

    it('should sync device lists between 3 devices (A->B, A->C)', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        const { newAccount: account2 } = await onboardDevice(account, secureEncryptedStorage);
        const { newAccount: account3 } = await onboardDevice(account, secureEncryptedStorage);

        accounts.push(account);
        accounts.push(account2);
        accounts.push(account3);

        await vi.waitFor(async () => {
            const devices1 = await account.getDevices();
            const devices2 = await account2.getDevices();
            const devices3 = await account3.getDevices();

            expect(devices1).toEqual(devices2);
            expect(devices2).toEqual(devices3);
        });
    }, 10000);

    it('should sync device lists between 3 devices (A->B, B->C)', async () => {
        const account = await factory.createSyncAccount(secureEncryptedStorage);
        const { newAccount: account2, secureEncryptedStorage: secureEncryptedStorage2 } =
            await onboardDevice(account, secureEncryptedStorage);
        const { newAccount: account3 } = await onboardDevice(account2, secureEncryptedStorage2);

        accounts.push(account);
        accounts.push(account2);
        accounts.push(account3);

        await vi.waitFor(async () => {
            const devices1 = await account.getDevices();
            const devices2 = await account2.getDevices();
            const devices3 = await account3.getDevices();

            expect(devices1).toEqual(devices2);
            expect(devices2).toEqual(devices3);
        });
    }, 10000);

    // Scenario 1:
    // - User has two devices A (online) and B (offline)
    // - User adds device C from A, and then send snapshots to server from C
    // - B comes online and receives snapshot from device C, but there is no yet device C in the B's device list
    // - B should be able to handle this snapshot
    it('should perform scenario 1', async () => {
        const accountA = await factory.createSyncAccount(secureEncryptedStorage);
        const { newAccount: accountB } = await onboardDevice(accountA, secureEncryptedStorage);
        accountB.syncProvider.dispose();

        const { newAccount: accountC } = await onboardDevice(accountA, secureEncryptedStorage);

        accounts.push(accountA);
        accounts.push(accountC);

        await setAndVerify(accountC, walletItems('wallet1', 'wallet2'));

        accountB.syncProvider.restart();

        await vi.waitFor(async () => {
            const walletsB = accountB.syncProvider.get('wallets');
            expect(walletsB).toEqual(walletItems('wallet1', 'wallet2'));
        });
    }, 10000);
});

function walletItems(...values: string[]): WalletItem[] {
    return values.map(value => ({
        __setId: value,
        value
    }));
}
