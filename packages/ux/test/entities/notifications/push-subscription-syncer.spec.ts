import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IPushNotifications, NotificationsApi, Portfolio } from '@safely/core';
import {
    deriveNotificationSyncId,
    NotificationSettings,
    PortfolioNetworkType,
    PortfolioWatchOnlyBtc,
    WatchOnlySource
} from '@safely/core';
import type { Logger } from '@safely/sync';

import type { PushSyncInput } from '../../../src/entities/notifications/push-subscription-syncer';
import { PushSubscriptionSyncer } from '../../../src/entities/notifications/push-subscription-syncer';
import { InMemoryTreeStorage } from '../../harness';

const ADDRESS = 'bc1q5v68nzc6rjgcl8ug0slpx77ucm4spnwzkwkqy2';

function portfolio(address = ADDRESS, name = 'w'): Portfolio {
    return PortfolioWatchOnlyBtc.create(
        { source: WatchOnlySource.ADDRESS, address, networkType: PortfolioNetworkType.MAINNET },
        { name, icon: { type: 'emoji', value: '🐶' } }
    );
}

function readyAccount(accountId: string, portfolios: Portfolio[] = [portfolio()]) {
    return {
        accountId,
        state: {
            kind: 'ready' as const,
            portfolios,
            settings: NotificationSettings.fromStored(undefined)
        }
    };
}

function pendingAccount(accountId: string) {
    return { accountId, state: { kind: 'pending' as const } };
}

function createHarness() {
    const storage = new InMemoryTreeStorage(['ux']);
    const api = {
        replaceGroup: vi.fn<NotificationsApi['replaceGroup']>(async () => ({})),
        deleteGroup: vi.fn<NotificationsApi['deleteGroup']>(async () => undefined),
        deleteDevice: vi.fn<NotificationsApi['deleteDevice']>(async () => undefined),
        replaceGeneral: vi.fn<NotificationsApi['replaceGeneral']>(async () => undefined),
        deleteGeneral: vi.fn<NotificationsApi['deleteGeneral']>(async () => undefined),
        replaceSync: vi.fn<NotificationsApi['replaceSync']>(async () => undefined),
        deleteSync: vi.fn<NotificationsApi['deleteSync']>(async () => undefined),
        announceSyncEvent: vi.fn<NotificationsApi['announceSyncEvent']>(async () => undefined)
    };
    const getPushToken = vi.fn<IPushNotifications['getPushToken']>(
        async () => 'ExponentPushToken[test]'
    );
    const setWalletNames = vi.fn<IPushNotifications['setWalletNames']>(async () => undefined);
    const pushNotifications: IPushNotifications = {
        getPermissionStatus: async () => 'granted',
        requestPermission: async () => 'granted',
        getPushToken,
        openSystemSettings: () => undefined,
        setWalletNames
    };
    const logger = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn()
    } as unknown as Logger;

    const syncer = new PushSubscriptionSyncer({
        api: api as unknown as NotificationsApi,
        pushNotifications,
        platform: 'ios',
        appVersion: '1.2.4',
        storage,
        logger
    });

    const stored = (key: string) => storage.child('push-subscription').getItem(key);

    return { syncer, api, storage, stored, getPushToken, setWalletNames };
}

const active = (accounts: PushSyncInput['accounts'], isNewsEnabled = false): PushSyncInput => ({
    isPushActive: true,
    isNewsEnabled,
    lang: 'en',
    accounts
});

describe('PushSubscriptionSyncer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('registers a group for a ready account and reuses its id on the next sync', async () => {
        const { syncer, api, stored } = createHarness();

        await syncer.sync(active([readyAccount('a')]));

        expect(api.replaceGroup).toHaveBeenCalledTimes(1);
        const [deviceId, groupId] = api.replaceGroup.mock.calls[0]!;
        expect(await stored('deviceId')).toBe(JSON.stringify(deviceId));
        expect(await stored('groupIds')).toBe(JSON.stringify({ a: groupId }));

        await syncer.sync(active([readyAccount('a')]));
        expect(api.replaceGroup).toHaveBeenCalledTimes(1);
    });

    it('never deletes groups of accounts that are still hydrating', async () => {
        const { syncer, api } = createHarness();

        await syncer.sync(active([readyAccount('a'), readyAccount('b')]));
        await syncer.sync(active([pendingAccount('a'), readyAccount('b')]));

        expect(api.deleteGroup).not.toHaveBeenCalled();
        expect(api.replaceGroup).toHaveBeenCalledTimes(2);
    });

    it('deletes groups of removed accounts and of accounts with nothing to subscribe', async () => {
        const { syncer, api, stored } = createHarness();

        await syncer.sync(active([readyAccount('a'), readyAccount('b')]));
        await syncer.sync(active([readyAccount('b', [])]));

        expect(api.deleteGroup).toHaveBeenCalledTimes(2);
        expect(await stored('groupIds')).toBe(JSON.stringify({}));
    });

    it('keeps the reserved group id and retries once after a failed PUT', async () => {
        const { syncer, api, stored } = createHarness();
        api.replaceGroup.mockRejectedValueOnce(new Error('offline'));

        await syncer.sync(active([readyAccount('a')]));

        expect(api.replaceGroup).toHaveBeenCalledTimes(1);
        const groupIds = JSON.parse((await stored('groupIds')) ?? '{}') as Record<string, string>;
        expect(Object.keys(groupIds)).toEqual(['a']);

        await vi.advanceTimersByTimeAsync(30_000);

        expect(api.replaceGroup).toHaveBeenCalledTimes(2);
        expect(api.replaceGroup.mock.calls[1]?.[1]).toBe(groupIds.a);
    });

    it('coalesces syncs that arrive during a run into one extra run with the latest input', async () => {
        const { syncer, api } = createHarness();
        let release: (value: Record<string, string>) => void = () => undefined;
        const blocked = new Promise<Record<string, string>>(resolve => {
            release = resolve;
        });
        api.replaceGroup.mockImplementationOnce(() => blocked);

        const first = syncer.sync(active([readyAccount('a')]));
        void syncer.sync(active([readyAccount('a'), readyAccount('b')]));
        void syncer.sync(active([readyAccount('a'), readyAccount('c')]));
        await vi.advanceTimersByTimeAsync(0);
        release({});
        await first;

        const putAccounts = api.replaceGroup.mock.calls.map(
            call => (call as unknown as [string, string, { events: { targets: string[] }[] }])[2]
        );
        expect(putAccounts).toHaveLength(2);
        expect(api.deleteGroup).not.toHaveBeenCalled();
    });

    it('reset deletes the device and forgets local state; no requests when nothing is registered', async () => {
        const { syncer, api, stored } = createHarness();

        await syncer.reset();
        expect(api.deleteDevice).not.toHaveBeenCalled();

        await syncer.sync(active([readyAccount('a')]));
        await syncer.sync({ isPushActive: false, isNewsEnabled: false, lang: 'en', accounts: [] });

        expect(api.deleteDevice).toHaveBeenCalledTimes(1);
        expect(await stored('deviceId')).toBeNull();
        expect(await stored('groupIds')).toBeNull();
        expect(await stored('syncIds')).toBeNull();
    });

    it('subscribes every enabled account to sync device events and unsubscribes removed ones', async () => {
        const { syncer, api, stored } = createHarness();
        const syncA = deriveNotificationSyncId('a');
        const syncB = deriveNotificationSyncId('b');
        const events = ['device-connected', 'device-disconnected'];

        await syncer.sync(active([readyAccount('a'), readyAccount('b', [])]));

        expect(api.replaceSync.mock.calls.map(([, id, sub]) => [id, sub])).toEqual([
            [syncA, { events }],
            [syncB, { events }]
        ]);
        expect(await stored('syncIds')).toBe(JSON.stringify({ a: syncA, b: syncB }));

        await syncer.sync(active([readyAccount('a'), pendingAccount('b')]));
        expect(api.replaceSync).toHaveBeenCalledTimes(2);
        expect(api.deleteSync).not.toHaveBeenCalled();

        await syncer.sync(active([readyAccount('a')]));
        expect(api.deleteSync).toHaveBeenCalledWith(expect.any(String), syncB);
        expect(await stored('syncIds')).toBe(JSON.stringify({ a: syncA }));
    });

    it('announces with the enrolled device id, or without one when pushes are off', async () => {
        const { syncer, api } = createHarness();

        await syncer.announceSyncEvent('a', 'device-connected');
        const [syncId, first] = api.announceSyncEvent.mock.calls[0]!;
        expect(syncId).toBe(deriveNotificationSyncId('a'));
        expect(first.type).toBe('device-connected');

        await syncer.sync(active([readyAccount('a')]));
        const [deviceId] = api.replaceGroup.mock.calls[0]!;
        await syncer.announceSyncEvent('a', 'device-disconnected');
        const [, second] = api.announceSyncEvent.mock.calls[1]!;

        expect(second.sender_device_id).toBe(deviceId);
        expect(first).not.toHaveProperty('sender_device_id');
        expect(first.event_id).not.toBe(second.event_id);
    });

    it('replays the general subscription once per change and registers a device without groups', async () => {
        const { syncer, api, stored } = createHarness();

        await syncer.sync(active([], true));
        await syncer.sync(active([], true));

        expect(api.replaceGeneral).toHaveBeenCalledTimes(1);
        expect(api.replaceGeneral.mock.calls[0]?.[1]).toEqual({ news: true });
        expect(api.replaceGeneral.mock.calls[0]?.[2]).toMatchObject({
            lang: 'en',
            appVersion: '1.2.4'
        });
        expect(await stored('deviceId')).not.toBeNull();

        await syncer.sync(active([], false));

        expect(api.deleteGeneral).toHaveBeenCalledTimes(1);
    });

    it('skips the run without a push token and retries after 30s', async () => {
        const { syncer, api, getPushToken } = createHarness();
        getPushToken.mockRejectedValueOnce(new Error('no firebase'));

        await syncer.sync(active([readyAccount('a')]));
        expect(api.replaceGroup).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(30_000);
        expect(api.replaceGroup).toHaveBeenCalledTimes(1);
    });

    it('publishes target_ref → wallet name and republishes on rename without a new PUT', async () => {
        const { syncer, api, setWalletNames } = createHarness();
        api.replaceGroup.mockResolvedValueOnce({ [ADDRESS]: 'ref-1' });

        await syncer.sync(active([readyAccount('a', [portfolio(ADDRESS, 'Reserve')])]));
        expect(setWalletNames).toHaveBeenLastCalledWith({ 'ref-1': '🐶 Reserve' });

        await syncer.sync(active([readyAccount('a', [portfolio(ADDRESS, 'Family')])]));
        expect(api.replaceGroup).toHaveBeenCalledTimes(1);
        expect(setWalletNames).toHaveBeenLastCalledWith({ 'ref-1': '🐶 Family' });
        expect(setWalletNames).toHaveBeenCalledTimes(2);

        await syncer.reset();
        expect(setWalletNames).toHaveBeenLastCalledWith({});
    });

    it('does not publish wallet names while the group PUT has never succeeded', async () => {
        const { syncer, api, setWalletNames } = createHarness();
        api.replaceGroup.mockRejectedValueOnce(new Error('offline'));

        await syncer.sync(active([readyAccount('a')]));

        expect(setWalletNames).not.toHaveBeenCalled();
    });
});
