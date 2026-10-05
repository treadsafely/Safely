/* eslint-disable @typescript-eslint/unbound-method */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { defineVersionHList, hCons, hNil, projectIdentity } from '@safely/slottree';
import type { NewOf } from '@safely/slottree';

import { SyncAccount } from '../../src/account/sync-account';
import type { SyncAccountRepository } from '../../src/account/sync-account-repository';
import { Logger } from '../../src/logger/logger';
import { ReconnectOnboarding } from '../../src/onboarding/reconnect/reconnect-onboarding';
import type { ISecretEncryptor } from '../../src/secret-encryptor';
import type { SyncContainer } from '../../src/sync-container';
import { SyncMachineRunResult } from '../../src/sync-machine/run-result';
import type { ISyncProvider } from '../../src/sync-provider/I-sync-provider';
import type { OnlineSyncProvider } from '../../src/sync-provider/online-sync-provider';
import { SyncStatus, SyncStatusManager } from '../../src/sync-provider/sync-status';

const TestSchema = z
    .object({
        value: z.string()
    })
    .partial();
const TestV1 = {
    version: 1,
    schema: TestSchema,
    initial: {},
    projectUp: projectIdentity,
    projectDown: projectIdentity
} as const;
const TestVersions = defineVersionHList(hCons(TestV1, hNil));
type TestLatest = (typeof TestVersions)['head'];
type TestRest = (typeof TestVersions)['tail'];
type TestProviderSchema = NewOf<TestLatest>;

describe('SyncAccount reconnect onboarding', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('returns the active reconnect connector for concurrent calls', async () => {
        const { account, container } = createDeletedAccount();

        const [first, second] = await Promise.all([
            account.reconnectToAccount(),
            account.reconnectToAccount()
        ]);

        expect(first).toBe(second);
        expect(container.ikService.getPub).toHaveBeenCalledTimes(1);
    });

    it('runs reconnect completion once and clears the active connector after success', async () => {
        const waitForOnboarding = vi
            .spyOn(ReconnectOnboarding.prototype, 'waitForOnboarding')
            .mockResolvedValue(undefined);
        const { account } = createDeletedAccount();

        const connector = await account.reconnectToAccount();
        expect(waitForOnboarding).toHaveBeenCalledTimes(1);

        const [firstResult, secondResult] = await Promise.all([
            connector.waitForCompletion(),
            connector.waitForCompletion()
        ]);

        expect(firstResult).toEqual({ account, inviterIkPub: null });
        expect(secondResult).toBe(firstResult);
        expect(waitForOnboarding).toHaveBeenCalledTimes(1);

        const nextConnector = await account.reconnectToAccount();
        expect(nextConnector).not.toBe(connector);
    });

    it('clears the active reconnect connector after failure', async () => {
        vi.spyOn(ReconnectOnboarding.prototype, 'waitForOnboarding').mockRejectedValue(
            new Error('failed')
        );
        const { account } = createDeletedAccount();

        const connector = await account.reconnectToAccount();

        await expect(connector.waitForCompletion()).rejects.toThrow('failed');
        await expect(account.reconnectToAccount()).resolves.not.toBe(connector);
    });

    it('clears the active reconnect connector after abort', async () => {
        const { account } = createDeletedAccount();

        const connector = await account.reconnectToAccount();
        connector.abort();

        await expect(account.reconnectToAccount()).resolves.not.toBe(connector);
    });

    it('waits for the current sync machine run result instead of current deleted status', async () => {
        vi.useFakeTimers();

        const syncStatusManager = new SyncStatusManager(SyncStatus.DEVICE_DELETED);
        const restart = vi.fn();
        const waitForCurrentRunResult = vi.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 5000));
            return SyncMachineRunResult.SYNCHRONIZED;
        });
        const syncProvider = {
            syncStatusManager,
            restart,
            waitForCurrentRunResult
        } as unknown as OnlineSyncProvider<TestLatest, TestRest>;
        const info = vi.fn();
        const logger = { info } as unknown as Logger;
        const onboarding = new ReconnectOnboarding(
            Buffer.alloc(0),
            syncProvider,
            logger,
            1000,
            0,
            1
        );

        const promise = onboarding.waitForOnboarding();

        await vi.advanceTimersByTimeAsync(2000);

        expect(restart).toHaveBeenCalledTimes(1);
        expect(waitForCurrentRunResult).toHaveBeenCalledTimes(1);
        expect(info).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(3000);

        await expect(promise).resolves.toBeUndefined();
    });
});

function createDeletedAccount(): {
    account: SyncAccount<TestLatest, TestRest>;
    container: SyncContainer<TestLatest, TestRest> & { ikService: { getPub: () => Buffer } };
} {
    const syncProvider = {
        structure: TestSchema,
        syncStatusManager: new SyncStatusManager(SyncStatus.DEVICE_DELETED),
        get: vi.fn(),
        getAll: vi.fn(),
        set: vi.fn(),
        transaction: vi.fn(),
        remove: vi.fn(),
        onChange: vi.fn(() => () => undefined),
        onDevicesChange: vi.fn(() => () => undefined),
        onError: vi.fn(() => () => undefined),
        dispose: vi.fn(),
        restart: vi.fn(),
        waitForCurrentRunResult: vi.fn(() => new Promise(() => undefined)),
        triggerSync: vi.fn()
    } as unknown as ISyncProvider<TestProviderSchema>;
    const container = {
        ikService: { getPub: vi.fn().mockReturnValue(Buffer.from('01', 'hex')) },
        logger: new Logger({ log: () => undefined }),
        secretEncryptor: {} as ISecretEncryptor
    } as unknown as SyncContainer<TestLatest, TestRest> & { ikService: { getPub: () => Buffer } };

    return {
        account: new SyncAccount({
            accountId: 'account-id',
            structure: TestVersions,
            syncProvider,
            container,
            syncAccountRepository: {} as SyncAccountRepository,
            online: true
        }),
        container
    };
}
