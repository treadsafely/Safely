import { vi } from 'vitest';

import type { IVaultSecretEncryptor, ISyncAccount, ITreeStorage } from '@safely/sync';
import type { SyncedStorageStructure } from '@safely/sync-storage';

import type { DraftRecorder } from './draft-recorder';
import { createDraftRecorder } from './draft-recorder';

export type MockSyncAccountOptions = {
    accountId?: string;
    initial?: Record<string, unknown>;
    rootSeedKey?: Uint8Array;
    deviceIkPub?: Buffer;
};

export type MockSyncAccount = ISyncAccount<SyncedStorageStructure> & {
    transactions: DraftRecorder[];
    onChangeHandlers: Map<string, Set<(value: unknown) => void>>;
    triggerChange<K extends string>(key: K, value: unknown): void;
};

const ZERO_ROOT_SEED_KEY = Buffer.alloc(32, 0);
const ZERO_IK_PUB = Buffer.alloc(32, 0xaa);

export function createPassthroughSyncEncryptor(): IVaultSecretEncryptor {
    return {
        encrypt: vi.fn(async (s: string) => s),
        decrypt: vi.fn(async (s: string) => s)
    };
}

export function createMockSyncAccount(opts: MockSyncAccountOptions = {}): MockSyncAccount {
    const accountId = opts.accountId ?? 'test-account';
    const initial: Record<string, unknown> = {
        meta: { name: 'Test Account' },
        portfolios: [],
        contacts: [],
        preferredFiat: null,
        devicesMeta: null,
        nextDerivingPortfolioInfo: null,
        amountDisplay: {},
        ...opts.initial
    };

    const rootSeedKey = opts.rootSeedKey ?? ZERO_ROOT_SEED_KEY;
    const ikPub = opts.deviceIkPub ?? ZERO_IK_PUB;

    const transactions: DraftRecorder[] = [];
    const onChangeHandlers = new Map<string, Set<(value: unknown) => void>>();

    const transaction = vi.fn(async (f: (draft: unknown) => void) => {
        const recorder = createDraftRecorder(initial);
        transactions.push(recorder);
        f(recorder.root);
    });

    const get = vi.fn(<K extends string>(key: K) => initial[key]);
    const getAll = vi.fn(() => ({ ...initial }));
    const onChange = vi.fn(<K extends string>(key: K, observer: (value: unknown) => void) => {
        let bucket = onChangeHandlers.get(key);
        if (!bucket) {
            bucket = new Set();
            onChangeHandlers.set(key, bucket);
        }
        bucket.add(observer);
        return () => bucket?.delete(observer);
    });

    const syncProvider = {
        transaction,
        get,
        getAll,
        onChange,
        onDevicesChange: vi.fn(() => () => undefined),
        onError: vi.fn(() => () => undefined),
        dispose: vi.fn(),
        restart: vi.fn(),
        triggerSync: vi.fn(),
        syncStatusManager: {
            subscribe: vi.fn(() => () => undefined),
            getStatus: vi.fn()
        }
    };

    const secureSecretEncryptor = createPassthroughSyncEncryptor();

    const account = {
        accountId,
        syncProvider,
        secureSecretEncryptor,
        connectToNewDevice: vi.fn(async (_: Buffer, __: ITreeStorage) => ({
            newDeviceIkPub: Buffer.from('BBBB', 'hex')
        })),
        reconnectToAccount: vi.fn(),
        getDevices: vi.fn(async () => []),
        revokeRemoteDevice: vi.fn(async () => undefined),
        getMyDeviceIkPub: vi.fn(() => ikPub),
        deriveKeyFromMasterKey: vi.fn(async () => Buffer.from(rootSeedKey)),
        transactions,
        onChangeHandlers,
        triggerChange(key: string, value: unknown) {
            onChangeHandlers.get(key)?.forEach(cb => cb(value));
        }
    } as unknown as MockSyncAccount;

    return account;
}
