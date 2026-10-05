import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Clock } from '@safely/slottree';

import { SyncStatus } from '../../src/sync-provider/sync-status';
import type { TestSyncAccount } from '../fixtures/account';
import { onboardMockAccount } from '../helpers/onboarding';
import { waitForNextSynchronizationCycle } from '../helpers/synchronization';
import { InMemStorage } from '../mocks/server-mock/storage';
import { makeFactory } from '../mocks/server-mock/sync-server-factory';
import { initializeSyncServer } from '../mocks/server-mock/sync-server-registry';

const INITIAL_TIME = 1_800_000_000;
const FAST_TIME = 2_000_000_000;
const SLOW_TIME = 1_000_000_000;
const WAIT_TIMEOUT_MS = 10_000;

class MutableClock implements Clock {
    constructor(private seconds: number) {}

    public nowSeconds(): number {
        return this.seconds;
    }

    public set(seconds: number): void {
        this.seconds = seconds;
    }
}

describe('sync with divergent clocks', { timeout: 20_000 }, () => {
    const accounts: TestSyncAccount[] = [];

    beforeEach(() => {
        initializeSyncServer();
        accounts.length = 0;
    });

    afterEach(() => {
        for (const account of accounts) {
            account.syncProvider.dispose();
        }
    });

    it('lets a slow device write a newer value after observing a future snapshot', async () => {
        const fastClock = new MutableClock(INITIAL_TIME);
        const slowClock = new MutableClock(INITIAL_TIME);
        const fastFactory = makeFactory(fastClock);
        const slowFactory = makeFactory(slowClock);
        const fastSecureStorage = new InMemStorage();
        const slowSecureStorage = new InMemStorage();

        const fastAccount = await fastFactory.factory.createSyncAccount(fastSecureStorage);
        accounts.push(fastAccount);
        const slowAccount = await onboardMockAccount(
            fastAccount,
            fastSecureStorage,
            slowFactory,
            slowSecureStorage
        );
        accounts.push(slowAccount);

        fastClock.set(FAST_TIME);
        slowClock.set(SLOW_TIME);
        slowAccount.syncProvider.dispose();

        await waitForNextSynchronizationCycle(
            fastAccount,
            'fast device synchronization cycle',
            async () => {
                await setConflictWallet(fastAccount, 'from-fast-device');
            }
        );

        await setConflictWallet(slowAccount, 'from-slow-device-offline');

        slowAccount.syncProvider.restart();
        await slowAccount.syncProvider.syncStatusManager.waitForStatus(SyncStatus.SYNCHRONIZED);

        await expectWalletsToConverge(fastAccount, slowAccount, 'from-fast-device');

        await waitForNextSynchronizationCycle(
            slowAccount,
            'slow device synchronization cycle',
            async () => {
                await setConflictWallet(slowAccount, 'from-slow-device-after-merge');
            }
        );

        await expectWalletsToConverge(fastAccount, slowAccount, 'from-slow-device-after-merge');
    });
});

async function setConflictWallet(account: TestSyncAccount, value: string): Promise<void> {
    await account.syncProvider.transaction(draft => {
        draft.set('wallets', [
            {
                __setId: 'conflict',
                value
            }
        ]);
    });
}

async function expectWalletsToConverge(
    first: TestSyncAccount,
    second: TestSyncAccount,
    value: string
): Promise<void> {
    await vi.waitFor(
        () => {
            const expected = [{ __setId: 'conflict', value }];
            expect(first.syncProvider.get('wallets')).toEqual(expected);
            expect(second.syncProvider.get('wallets')).toEqual(expected);
        },
        { timeout: WAIT_TIMEOUT_MS, interval: 1 }
    );
}
