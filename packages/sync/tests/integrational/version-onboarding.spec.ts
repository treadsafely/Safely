import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { AssertVersionHList, HCons, StorageVersion } from '@safely/slottree';
import { defineVersionHList, hCons, hNil, patch, projectIdentity } from '@safely/slottree';

import type { ISyncAccount } from '../../src';
import { SyncAccountFactory } from '../../src';
import { Logger } from '../../src/logger/logger';
import { SyncStatus } from '../../src/sync-provider/sync-status';
import { InMemStorage } from '../mocks/server-mock/storage';
import { SyncServer } from '../mocks/server-mock/sync-server';
import { createSyncServerApiImplementations } from '../mocks/server-mock/sync-server-api-implementations';

const walletSchema = z.object({
    __setId: z.string(),
    value: z.string()
});
type WalletItem = z.output<typeof walletSchema>;

const schemaV1 = z.object({
    wallets: z.array(walletSchema)
});

const schemaV2 = z.object({
    wallets: z.array(walletSchema),
    newField: z.string().default('new-field-initial')
});

const projectV1ToV2 = patch(schemaV1, schemaV2, draft =>
    draft.newField([], 'newField', 'new-field-initial')
);

const projectV2ToV1 = patch(schemaV2, schemaV1, draft => draft.deleteField([], 'newField'));

const accountV1 = {
    version: 1,
    schema: schemaV1,
    initial: {
        wallets: [] as WalletItem[]
    },
    projectUp: projectIdentity,
    projectDown: projectIdentity
} as const;

const accountV2 = {
    version: 2,
    schema: schemaV2,
    initial: {
        wallets: [] as WalletItem[],
        newField: 'new-field-initial'
    },
    projectUp: projectV1ToV2,
    projectDown: projectV2ToV1
} as const;

const versionsV1 = defineVersionHList(hCons(accountV1, hNil));
const versionsV2 = defineVersionHList(hCons(accountV2, hCons(accountV1, hNil)));

type VersionHList = HCons<StorageVersion, unknown>;

type VersionedFactory<Versions extends VersionHList> = {
    factory: SyncAccountFactory<Versions>;
    secureEncryptedStorage: InMemStorage;
};

describe('versioned onboarding', () => {
    let server: SyncServer;
    const accounts: Array<ISyncAccount<StorageVersion>> = [];

    beforeEach(() => {
        server = new SyncServer();
        accounts.length = 0;
    });

    afterEach(() => {
        for (const account of accounts) {
            account.syncProvider.dispose();
        }
    });

    it('shows v2 device data on a newly onboarded v1 device', async () => {
        const deviceA = makeVersionedFactory(versionsV2);
        const deviceB = makeVersionedFactory(versionsV1);
        const accountA = await deviceA.factory.createSyncAccount(deviceA.secureEncryptedStorage);
        accounts.push(accountA);

        await accountA.syncProvider.transaction(draft => {
            draft.set('wallets', walletItems('wallet-a'));
            draft.set('newField', 'from-v2');
        });

        const accountB = await onboardDevice(accountA, deviceA, deviceB);
        accounts.push(accountB);

        await vi.waitFor(() => {
            expect(accountB.syncProvider.get('wallets')).toEqual(walletItems('wallet-a'));
        });
    });

    it('shows v1 device data and v2 initial field on a newly onboarded v2 device', async () => {
        const deviceA = makeVersionedFactory(versionsV1);
        const deviceB = makeVersionedFactory(versionsV2);
        const accountA = await deviceA.factory.createSyncAccount(deviceA.secureEncryptedStorage);
        accounts.push(accountA);

        await accountA.syncProvider.transaction(draft => {
            draft.set('wallets', walletItems('wallet-a'));
        });

        const accountB = await onboardDevice(accountA, deviceA, deviceB);
        accounts.push(accountB);

        await vi.waitFor(() => {
            expect(accountB.syncProvider.get('wallets')).toEqual(walletItems('wallet-a'));
            expect(accountB.syncProvider.get('newField')).toBe('new-field-initial');
        });
    });

    it('syncs post-onboarding v1 updates to a v2 device', async () => {
        const deviceA = makeVersionedFactory(versionsV2);
        const deviceB = makeVersionedFactory(versionsV1);
        const accountA = await deviceA.factory.createSyncAccount(deviceA.secureEncryptedStorage);
        accounts.push(accountA);

        const accountB = await onboardDevice(accountA, deviceA, deviceB);
        accounts.push(accountB);

        await accountB.syncProvider.transaction(draft => {
            draft.set('wallets', walletItems('from-v1'));
        });

        await vi.waitFor(() => {
            expect(accountA.syncProvider.get('wallets')).toEqual(walletItems('from-v1'));
        });
    });

    it('preserves v2-only data after receiving subsequent v1 updates', async () => {
        const deviceA = makeVersionedFactory(versionsV2);
        const deviceB = makeVersionedFactory(versionsV1);
        const accountA = await deviceA.factory.createSyncAccount(deviceA.secureEncryptedStorage);
        accounts.push(accountA);

        const accountB = await onboardDevice(accountA, deviceA, deviceB);
        accounts.push(accountB);

        const accountASynchronized = waitForNextSynchronizationCycle(accountA);
        const accountBSynchronized = waitForNextSynchronizationCycle(accountB);
        await accountA.syncProvider.transaction(draft => {
            draft.set('newField', 'v2-only');
        });
        await Promise.all([accountASynchronized, accountBSynchronized]);

        await accountB.syncProvider.transaction(draft => {
            draft.set('wallets', walletItems('from-v1'));
        });

        await vi.waitFor(() => {
            expect(accountA.syncProvider.get('wallets')).toEqual(walletItems('from-v1'));
            expect(accountA.syncProvider.get('newField')).toBe('v2-only');
        });
    });

    it('onboards a v2 device from a v2 device', async () => {
        const deviceA = makeVersionedFactory(versionsV2);
        const deviceB = makeVersionedFactory(versionsV2);
        const accountA = await deviceA.factory.createSyncAccount(deviceA.secureEncryptedStorage);
        accounts.push(accountA);

        await accountA.syncProvider.transaction(draft => {
            draft.set('wallets', walletItems('wallet-a'));
            draft.set('newField', 'from-v2');
        });

        const accountB = await onboardDevice(accountA, deviceA, deviceB);
        accounts.push(accountB);

        await vi.waitFor(() => {
            expect(accountB.syncProvider.get('wallets')).toEqual(walletItems('wallet-a'));
            expect(accountB.syncProvider.get('newField')).toBe('from-v2');
        });
    });

    function makeVersionedFactory<Versions extends VersionHList>(
        versions: Versions & AssertVersionHList<Versions>
    ): VersionedFactory<Versions> {
        const storage = new InMemStorage();
        const encryptedStorage = new InMemStorage();
        const secureEncryptedStorage = new InMemStorage();
        const logger = new Logger({ log: () => undefined });

        return {
            factory: new SyncAccountFactory<Versions>({
                storage,
                encryptedStorage,
                versions,
                apiConfiguration: {
                    basePath: 'sync-server://mock'
                },
                apiImplementationsFactory: requesterIk =>
                    createSyncServerApiImplementations(server, requesterIk),
                pollingTimeout: 1,
                logger
            }),
            secureEncryptedStorage
        };
    }
});

async function onboardDevice<
    ExistingLatest extends StorageVersion,
    NewLatest extends StorageVersion
>(
    existingAccount: ISyncAccount<ExistingLatest>,
    existingDevice: VersionedFactory<VersionHList>,
    newDevice: VersionedFactory<VersionHList>
): Promise<ISyncAccount<NewLatest>> {
    const onboardingConnector = await newDevice.factory.connectToExistingSyncAccount(
        newDevice.secureEncryptedStorage
    );

    const primaryOnboarding = existingAccount.connectToNewDevice(
        onboardingConnector.data,
        existingDevice.secureEncryptedStorage
    );
    const [onboarded] = await Promise.all([
        onboardingConnector.waitForCompletion(),
        primaryOnboarding
    ]);

    return onboarded.account as ISyncAccount<NewLatest>;
}

function walletItems(...values: string[]) {
    return values.map(value => ({
        __setId: value,
        value
    }));
}

async function waitForNextSynchronizationCycle(
    account: ISyncAccount<StorageVersion>
): Promise<void> {
    const statusManager = account.syncProvider.syncStatusManager;
    let sawSynchronizing = statusManager.getStatus() === SyncStatus.SYNCHRONIZING;
    let unsubscribe: () => void = () => undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
        await new Promise<void>((resolve, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error('Timed out waiting for synchronization cycle'));
            }, 2000);
            unsubscribe = statusManager.subscribe(status => {
                if (status === SyncStatus.SYNCHRONIZING) {
                    sawSynchronizing = true;
                }
                if (sawSynchronizing && status === SyncStatus.SYNCHRONIZED) {
                    resolve();
                }
            });
        });
    } finally {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
        unsubscribe();
    }
}
