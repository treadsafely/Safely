import fc from 'fast-check';
import { expect, vi } from 'vitest';

import type { Device } from '../../src/device-manager/device-repository';
import { SyncStatus } from '../../src/sync-provider/sync-status';
import type { TestSyncAccount } from '../fixtures/account';
import { onboardMockAccount } from '../helpers/onboarding';
import { waitForNextSynchronizationCycle, waitWithTimeout } from '../helpers/synchronization';
import { InMemStorage } from '../mocks/server-mock/storage';
import { makeFactory } from '../mocks/server-mock/sync-server-factory';
import { initializeSyncServer } from '../mocks/server-mock/sync-server-registry';

type MockFactory = ReturnType<typeof makeFactory>;

const WAIT_TIMEOUT_MS = 10000;

let nextWalletIndex = 0;

export type SyncTestDevice = {
    account: TestSyncAccount;
    factory: MockFactory;
    secureEncryptedStorage: InMemStorage;
    online: boolean;
    deleted: boolean;
    reconnectable: boolean;
};

type RemoveDeviceSelector = {
    actorIndex: number;
    targetIndex: number;
};

export type Op =
    | {
          type: 'device.addOnlineFromOnline';
          actorIndex: number;
      }
    | {
          type: 'device.removeOnlineFromOnline';
          actorIndex: number;
          targetIndex: number;
      }
    | {
          type: 'device.removeOfflineFromOnline';
          actorIndex: number;
          targetIndex: number;
      }
    | {
          type: 'data.changeOnActiveDevice';
          actorIndex: number;
      }
    | {
          type: 'data.changeOnOfflineDevice';
          targetIndex: number;
      }
    | {
          type: 'device.reconnectDeletedDevice';
          actorIndex: number;
          targetIndex: number;
      }
    | {
          type: 'device.deleteLocalOnlineSelf';
          targetIndex: number;
      }
    | {
          type: 'device.returnOfflineOnline';
          targetIndex: number;
      }
    | {
          type: 'device.takeOnlineOffline';
          targetIndex: number;
      };

const deviceIndexArb = fc.nat(20);

export const opArb = fc.oneof(
    deviceIndexArb.map(actorIndex => ({
        type: 'device.addOnlineFromOnline',
        actorIndex
    })),

    fc
        .record({
            actorIndex: deviceIndexArb,
            targetIndex: deviceIndexArb
        })
        .map(({ actorIndex, targetIndex }) => ({
            type: 'device.removeOnlineFromOnline',
            actorIndex,
            targetIndex
        })),

    fc
        .record({
            actorIndex: deviceIndexArb,
            targetIndex: deviceIndexArb
        })
        .map(({ actorIndex, targetIndex }) => ({
            type: 'device.removeOfflineFromOnline',
            actorIndex,
            targetIndex
        })),

    deviceIndexArb.map(actorIndex => ({
        type: 'data.changeOnActiveDevice',
        actorIndex
    })),

    deviceIndexArb.map(targetIndex => ({
        type: 'data.changeOnOfflineDevice',
        targetIndex
    })),

    fc
        .record({
            actorIndex: deviceIndexArb,
            targetIndex: deviceIndexArb
        })
        .map(({ actorIndex, targetIndex }) => ({
            type: 'device.reconnectDeletedDevice',
            actorIndex,
            targetIndex
        })),

    deviceIndexArb.map(targetIndex => ({
        type: 'device.deleteLocalOnlineSelf',
        targetIndex
    })),

    deviceIndexArb.map(targetIndex => ({
        type: 'device.returnOfflineOnline',
        targetIndex
    })),

    deviceIndexArb.map(targetIndex => ({
        type: 'device.takeOnlineOffline',
        targetIndex
    }))
) as fc.Arbitrary<Op>;

export const opsArb = fc.array(opArb, { minLength: 30, maxLength: 50 });

export async function applyOp(devices: SyncTestDevice[], op: Op): Promise<void> {
    switch (op.type) {
        case 'device.addOnlineFromOnline': {
            await addOnlineDeviceFromOnlineDevice(devices, op);
            await waitForOnlineDevicesSynced(devices);
            return;
        }

        case 'device.removeOnlineFromOnline': {
            await removeDeviceFromOnlineDevice(devices, op);
            await waitForOnlineDevicesSynced(devices);
            return;
        }

        case 'device.removeOfflineFromOnline': {
            await removeDeviceFromOnlineDevice(devices, op);
            await waitForOnlineDevicesSynced(devices);
            return;
        }

        case 'data.changeOnActiveDevice': {
            await changeDataOnActiveDevice(devices, op);
            await waitForOnlineDevicesSynced(devices);
            return;
        }

        case 'data.changeOnOfflineDevice': {
            await changeDataOnOfflineDevice(devices, op);
            await waitForOnlineDevicesSynced(devices);
            return;
        }

        case 'device.reconnectDeletedDevice': {
            await reconnectDeletedDevice(devices, op);
            await waitForOnlineDevicesSynced(devices);
            return;
        }

        case 'device.deleteLocalOnlineSelf': {
            await deleteLocalOnlineSelfDevice(devices, op);
            await waitForOnlineDevicesSynced(devices);
            return;
        }

        case 'device.returnOfflineOnline': {
            await returnOfflineDeviceOnline(devices, op);
            await waitForOnlineDevicesSynced(devices);
            return;
        }

        case 'device.takeOnlineOffline': {
            takeOnlineDeviceOffline(devices, op);
            return;
        }

        default:
            return;
    }
}

export async function applyOps(devices: SyncTestDevice[], ops: Op[]): Promise<void> {
    for (const op of ops) {
        await applyOp(devices, op);
    }
}

export async function makeInitialDevices(): Promise<SyncTestDevice[]> {
    initializeSyncServer();
    nextWalletIndex = 0;

    const primaryFactory = makeFactory();
    const primarySecureEncryptedStorage = new InMemStorage();
    const primaryAccount = await primaryFactory.factory.createSyncAccount(
        primarySecureEncryptedStorage
    );
    const primaryDevice: SyncTestDevice = {
        account: primaryAccount,
        factory: primaryFactory,
        secureEncryptedStorage: primarySecureEncryptedStorage,
        online: false,
        deleted: false,
        reconnectable: false
    };

    const secondaryDevice = await onboardMockDevice(primaryDevice);
    primaryDevice.online = true;

    await waitForOnlineDevicesSynced([primaryDevice, secondaryDevice]);
    return [primaryDevice, secondaryDevice];
}

export async function waitForOnlineDevicesSynced(devices: SyncTestDevice[]): Promise<void> {
    const onlineDevices = devices.filter(device => device.online && !device.deleted);
    if (onlineDevices.length === 0) {
        return;
    }

    await waitWithTimeout(
        Promise.all(
            onlineDevices.map(device =>
                device.account.syncProvider.syncStatusManager.waitForStatus(SyncStatus.SYNCHRONIZED)
            )
        ),
        'online devices synchronized status'
    );

    if (onlineDevices.length === 1) {
        return;
    }

    await vi.waitFor(
        async () => {
            const [referenceDevice, ...restDevices] = onlineDevices;
            const referenceWallets = referenceDevice.account.syncProvider.get('wallets');
            const referenceDevices = normalizeDevices(await referenceDevice.account.getDevices());

            for (const device of restDevices) {
                expect(device.account.syncProvider.get('wallets')).toEqual(referenceWallets);
                expect(normalizeDevices(await device.account.getDevices())).toEqual(
                    referenceDevices
                );
            }
        },
        {
            interval: 1,
            timeout: WAIT_TIMEOUT_MS
        }
    );
}

async function waitForStatusWithTimeout(
    device: SyncTestDevice,
    status: SyncStatus,
    label: string
): Promise<void> {
    await waitWithTimeout(
        device.account.syncProvider.syncStatusManager.waitForStatus(status),
        label
    );
}

async function addOnlineDeviceFromOnlineDevice(
    devices: SyncTestDevice[],
    op: Extract<Op, { type: 'device.addOnlineFromOnline' }>
): Promise<void> {
    const actor = pickOnlineDevice(devices, op.actorIndex);
    if (!actor) {
        return;
    }

    const newDevice = await onboardMockDevice(actor);
    await waitForStatusWithTimeout(newDevice, SyncStatus.SYNCHRONIZED, 'new device synchronized');
    devices.push(newDevice);
}

async function removeDeviceFromOnlineDevice(
    devices: SyncTestDevice[],
    selector: RemoveDeviceSelector
): Promise<void> {
    const onlineDevices = devices.filter(device => device.online && !device.deleted);
    const actor = pickByIndex(onlineDevices, selector.actorIndex);
    if (!actor) {
        return;
    }

    const candidates = devices.filter(device => device !== actor && !device.deleted);
    const target = pickByIndex(candidates, selector.targetIndex);
    if (!target) {
        return;
    }

    const targetIkPub = target.account.getMyDeviceIkPub();
    await waitForNextSynchronizationCycle(
        actor.account,
        'device revocation synchronized',
        async () => actor.account.revokeRemoteDevice(targetIkPub, actor.secureEncryptedStorage)
    );

    target.account.syncProvider.dispose();
    target.online = false;
    target.deleted = true;
    target.reconnectable = true;
}

async function changeDataOnActiveDevice(
    devices: SyncTestDevice[],
    op: Extract<Op, { type: 'data.changeOnActiveDevice' }>
): Promise<void> {
    const actor = pickOnlineDevice(devices, op.actorIndex);
    if (!actor) {
        return;
    }

    await waitForNextSynchronizationCycle(actor.account, 'wallet change synchronized', async () => {
        await actor.account.syncProvider.transaction(draft => {
            const wallets = draft.at('wallets');
            const id = nextWalletId();
            wallets.push({
                __setId: id,
                value: id
            });
        });
    });
}

async function changeDataOnOfflineDevice(
    devices: SyncTestDevice[],
    op: Extract<Op, { type: 'data.changeOnOfflineDevice' }>
): Promise<void> {
    const device = pickOfflineDevice(devices, op.targetIndex);
    if (!device) {
        return;
    }

    await addWallet(device);
}

async function reconnectDeletedDevice(
    devices: SyncTestDevice[],
    op: Extract<Op, { type: 'device.reconnectDeletedDevice' }>
): Promise<void> {
    const actor = pickOnlineDevice(devices, op.actorIndex);
    if (!actor) {
        return;
    }

    const target = pickByIndex(
        devices.filter(device => device.deleted && device.reconnectable),
        op.targetIndex
    );
    if (!target) {
        return;
    }

    if (target.account.syncProvider.syncStatusManager.getStatus() !== SyncStatus.DEVICE_DELETED) {
        target.account.syncProvider.restart();
    }

    try {
        await waitForStatusWithTimeout(target, SyncStatus.DEVICE_DELETED, 'deleted device status');
    } catch {
        return;
    }

    const connector = await target.account.reconnectToAccount();

    await waitForNextSynchronizationCycle(
        actor.account,
        'device reconnection synchronized',
        async () => {
            const connectActor = actor.account.connectToNewDevice(
                connector.data,
                actor.secureEncryptedStorage
            );
            await waitWithTimeout(
                Promise.all([connectActor, connector.waitForCompletion()]),
                'mock device reconnection'
            );
        }
    );
    await waitForStatusWithTimeout(target, SyncStatus.SYNCHRONIZED, 'reconnected device synced');
    target.deleted = false;
    target.online = true;
    target.reconnectable = false;
}

async function deleteLocalOnlineSelfDevice(
    devices: SyncTestDevice[],
    op: Extract<Op, { type: 'device.deleteLocalOnlineSelf' }>
): Promise<void> {
    const target = pickOnlineDevice(devices, op.targetIndex);
    if (!target) {
        return;
    }

    await target.factory.factory.deleteLocalAccount(
        target.account.accountId,
        target.secureEncryptedStorage
    );
    target.online = false;
    target.deleted = true;
    target.reconnectable = false;
}

async function returnOfflineDeviceOnline(
    devices: SyncTestDevice[],
    op: Extract<Op, { type: 'device.returnOfflineOnline' }>
): Promise<void> {
    const device = pickOfflineDevice(devices, op.targetIndex);
    if (!device) {
        return;
    }

    device.account.syncProvider.restart();
    await waitForStatusWithTimeout(device, SyncStatus.SYNCHRONIZED, 'returned device synchronized');
    device.online = true;
}

function takeOnlineDeviceOffline(
    devices: SyncTestDevice[],
    op: Extract<Op, { type: 'device.takeOnlineOffline' }>
): void {
    const device = pickOnlineDevice(devices, op.targetIndex);
    if (!device) {
        return;
    }

    device.account.syncProvider.dispose();
    device.online = false;
}

function pickOnlineDevice(devices: SyncTestDevice[], index: number): SyncTestDevice | undefined {
    return pickByIndex(
        devices.filter(device => device.online && !device.deleted),
        index
    );
}

function pickOfflineDevice(devices: SyncTestDevice[], index: number): SyncTestDevice | undefined {
    return pickByIndex(
        devices.filter(device => !device.online && !device.deleted),
        index
    );
}

function pickByIndex<T>(items: T[], index: number): T | undefined {
    if (items.length === 0) {
        return undefined;
    }

    return items[index % items.length];
}

function normalizeDevices(devices: Device[]) {
    return devices
        .map(device => ({
            ikPub: device.info.ikPub.toString('hex'),
            addedAt: device.info.addedAt,
            sign: device.sign.toString('hex')
        }))
        .sort((left, right) => left.ikPub.localeCompare(right.ikPub));
}

function nextWalletId(): string {
    return `wallet-${nextWalletIndex++}`;
}

async function addWallet(device: SyncTestDevice): Promise<void> {
    await device.account.syncProvider.transaction(draft => {
        const wallets = draft.at('wallets');
        const id = nextWalletId();
        wallets.push({
            __setId: id,
            value: id
        });
    });
}

async function onboardMockDevice(actor: SyncTestDevice): Promise<SyncTestDevice> {
    const newDeviceFactory = makeFactory();
    const newDeviceSecureEncryptedStorage = new InMemStorage();
    const newAccount = await onboardMockAccount(
        actor.account,
        actor.secureEncryptedStorage,
        newDeviceFactory,
        newDeviceSecureEncryptedStorage
    );

    return {
        account: newAccount,
        factory: newDeviceFactory,
        secureEncryptedStorage: newDeviceSecureEncryptedStorage,
        online: true,
        deleted: false,
        reconnectable: false
    };
}
