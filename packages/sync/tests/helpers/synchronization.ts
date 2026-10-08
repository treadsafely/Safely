import { SyncStatus } from '../../src/sync-provider/sync-status';
import type { TestSyncAccount } from '../fixtures/account';

const DEFAULT_WAIT_TIMEOUT_MS = 10_000;

export async function waitForNextSynchronizationCycle<T>(
    account: TestSyncAccount,
    label: string,
    action: () => Promise<T>,
    timeoutMs = DEFAULT_WAIT_TIMEOUT_MS
): Promise<T> {
    let sawSynchronizing =
        account.syncProvider.syncStatusManager.getStatus() === SyncStatus.SYNCHRONIZING;
    let unsubscribe: (() => void) | undefined;

    const synchronized = new Promise<void>(resolve => {
        unsubscribe = account.syncProvider.syncStatusManager.subscribe(status => {
            if (status === SyncStatus.SYNCHRONIZING) {
                sawSynchronizing = true;
            }

            if (sawSynchronizing && status === SyncStatus.SYNCHRONIZED) {
                resolve();
            }
        });
    });

    try {
        const result = await action();
        await waitWithTimeout(synchronized, label, timeoutMs);
        return result;
    } finally {
        unsubscribe?.();
    }
}

export async function waitWithTimeout<T>(
    promise: Promise<T>,
    label: string,
    timeoutMs = DEFAULT_WAIT_TIMEOUT_MS
): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Timed out after ${timeoutMs}ms waiting for ${label}`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
    }
}
