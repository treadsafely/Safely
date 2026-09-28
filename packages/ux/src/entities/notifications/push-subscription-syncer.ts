import { v4 as uuid4 } from 'uuid';
import type z from 'zod';

import type {
    Build,
    IPushNotifications,
    ITreeStorage,
    NotificationSettings,
    NotificationsApi,
    Portfolio,
    PushDeviceCredentials,
    SubscriptionGroup,
    SyncEventType,
    SyncSubscription,
    TargetRefs
} from '@safely/core';
import {
    buildSubscriptionGroup,
    deriveNotificationSyncId,
    resolvePortfolioNotificationTargetNames
} from '@safely/core';
import type { Logger } from '@safely/sync';

import type { PushSubscriptionStorageStructure } from './storage';
import { pushSubscriptionStorageStructure } from './storage';
import type { IPushSubscriptionSyncer } from '../../shared';

const RETRY_DELAY_MS = 30_000;

export type AccountSubscriptionState =
    | { kind: 'ready'; portfolios: Portfolio[]; settings: NotificationSettings }
    | { kind: 'pending' };

export type PushSyncInput = {
    isPushActive: boolean;
    isNewsEnabled: boolean;
    lang: string;
    accounts: { accountId: string; state: AccountSubscriptionState }[];
};

type PushSubscriptionSyncerDeps = {
    api: NotificationsApi;
    pushNotifications: IPushNotifications;
    platform: Build;
    appVersion: string;
    storage: ITreeStorage;
    logger: Logger;
};

type StorageKey = keyof PushSubscriptionStorageStructure;
type StoredValue<K extends StorageKey> = z.output<PushSubscriptionStorageStructure[K]>;

type DesiredGroup = SubscriptionGroup | 'pending' | null;
type DesiredSync = 'wanted' | 'unwanted' | 'pending';

const RESET_INPUT: PushSyncInput = {
    isPushActive: false,
    isNewsEnabled: false,
    lang: '',
    accounts: []
};

const GENERAL_KEY = 'general';

const SYNC_SUBSCRIPTION: SyncSubscription = { events: ['device-connected', 'device-disconnected'] };

function toDesiredGroups(input: PushSyncInput): Map<string, DesiredGroup> {
    return new Map(
        input.accounts.map(({ accountId, state }) => [
            accountId,
            state.kind === 'pending'
                ? 'pending'
                : buildSubscriptionGroup(state.settings, state.portfolios)
        ])
    );
}

function toDesiredSyncs(input: PushSyncInput): Map<string, DesiredSync> {
    return new Map(
        input.accounts.map(({ accountId, state }) => [
            accountId,
            state.kind === 'pending' ? 'pending' : state.settings.enabled ? 'wanted' : 'unwanted'
        ])
    );
}

export class PushSubscriptionSyncer implements IPushSubscriptionSyncer {
    private readonly storage: ITreeStorage;

    private readonly lastSent = new Map<string, string>();

    private readonly targetRefs = new Map<string, TargetRefs>();

    private lastWalletNames = '';

    private running: Promise<void> | null = null;

    private pending: PushSyncInput | null = null;

    private retryTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(private readonly deps: PushSubscriptionSyncerDeps) {
        this.storage = deps.storage.child('push-subscription');
    }

    public sync(input: PushSyncInput): Promise<void> {
        this.cancelRetry();
        this.pending = input;
        this.running ??= this.drain();

        return this.running;
    }

    public reset(): Promise<void> {
        return this.sync(RESET_INPUT);
    }

    public dispose(): void {
        this.cancelRetry();
    }

    public async announceSyncEvent(accountId: string, type: SyncEventType): Promise<void> {
        await this.attempt('announce', async () => {
            const deviceId = await this.read('deviceId');
            this.deps.logger.info('push_subscription.announce', { type });
            await this.deps.api.announceSyncEvent(deriveNotificationSyncId(accountId), {
                event_id: uuid4(),
                type,
                ...(deviceId && { sender_device_id: deviceId })
            });
        });
    }

    private async drain(): Promise<void> {
        try {
            while (this.pending) {
                const input = this.pending;
                this.pending = null;

                const failures = await this.runOnce(input);
                if (failures > 0 && !this.pending) this.scheduleRetry(input);
            }
        } finally {
            this.running = null;
        }
    }

    private async runOnce(input: PushSyncInput): Promise<number> {
        if (!input.isPushActive) {
            return this.attempt('reset', () => this.resetDevice());
        }

        const syncIds = await this.readIds('syncIds');
        const groupIds = await this.readIds('groupIds');
        if (groupIds === null || syncIds === null) {
            return this.attempt('reset', () => this.resetDevice());
        }

        const deviceId = await this.resolveDeviceId();
        const pushToken = await this.resolvePushToken();
        if (pushToken === null) return 1;

        const credentials = this.buildCredentials(input, pushToken);
        const desiredGroups = toDesiredGroups(input);

        let failures = 0;
        failures += await this.reconcileGroups(deviceId, groupIds, desiredGroups, credentials);
        failures += await this.reconcileSyncs(
            deviceId,
            syncIds,
            toDesiredSyncs(input),
            credentials
        );
        failures += await this.reconcileGeneral(deviceId, input.isNewsEnabled, credentials);
        failures += await this.attempt('wallet_names', () =>
            this.publishWalletNames(input, desiredGroups)
        );

        return failures;
    }

    private buildCredentials(input: PushSyncInput, pushToken: string): PushDeviceCredentials {
        return {
            pushToken,
            platform: this.deps.platform,
            lang: input.lang,
            appVersion: this.deps.appVersion
        };
    }

    private async reconcileGroups(
        deviceId: string,
        storedIds: Record<string, string>,
        desired: Map<string, DesiredGroup>,
        credentials: PushDeviceCredentials
    ): Promise<number> {
        let failures = 0;

        for (const accountId of Object.keys(storedIds)) {
            if (desired.get(accountId)) continue;
            failures += await this.attempt('delete_group', () =>
                this.deleteGroup(deviceId, accountId)
            );
        }

        for (const [accountId, group] of desired) {
            if (group === 'pending' || group === null) continue;

            const signature = JSON.stringify({ credentials, group });
            if (this.lastSent.get(accountId) === signature) continue;

            failures += await this.attempt('replace_group', () =>
                this.replaceGroup(deviceId, accountId, group, credentials, signature)
            );
        }

        return failures;
    }

    private async reconcileSyncs(
        deviceId: string,
        storedIds: Record<string, string>,
        desired: Map<string, DesiredSync>,
        credentials: PushDeviceCredentials
    ): Promise<number> {
        let failures = 0;

        for (const accountId of Object.keys(storedIds)) {
            const state = desired.get(accountId) ?? 'unwanted';
            if (state !== 'unwanted') continue;
            failures += await this.attempt('delete_sync', () =>
                this.deleteSync(deviceId, accountId)
            );
        }

        const signature = JSON.stringify({ credentials, sync: SYNC_SUBSCRIPTION });
        for (const [accountId, state] of desired) {
            if (state !== 'wanted' || this.lastSent.get(this.getSyncKey(accountId)) === signature) {
                continue;
            }
            failures += await this.attempt('replace_sync', () =>
                this.replaceSync(deviceId, accountId, credentials, signature)
            );
        }

        return failures;
    }

    private reconcileGeneral(
        deviceId: string,
        isNewsEnabled: boolean,
        credentials: PushDeviceCredentials
    ): Promise<number> {
        const signature = JSON.stringify({ credentials, news: isNewsEnabled });
        if (this.lastSent.get(GENERAL_KEY) === signature) return Promise.resolve(0);

        return this.attempt('replace_general', () =>
            this.replaceGeneral(deviceId, isNewsEnabled, credentials, signature)
        );
    }

    private async publishWalletNames(
        input: PushSyncInput,
        desired: Map<string, DesiredGroup>
    ): Promise<void> {
        const names = this.collectWalletNames(input, desired);
        if (names === null) return;

        const signature = JSON.stringify(names);
        if (signature === this.lastWalletNames) return;

        await this.deps.pushNotifications.setWalletNames(names);
        this.lastWalletNames = signature;
    }

    private collectWalletNames(
        input: PushSyncInput,
        desired: Map<string, DesiredGroup>
    ): Record<string, string> | null {
        const names: Record<string, string> = {};

        for (const { accountId, state } of input.accounts) {
            const group = desired.get(accountId);
            if (state.kind === 'pending' || group === 'pending' || group === null) continue;

            const refs = this.targetRefs.get(accountId);
            if (!refs) return null;

            for (const portfolio of state.settings.selectPortfolios(state.portfolios)) {
                for (const [target, name] of Object.entries(
                    resolvePortfolioNotificationTargetNames(portfolio)
                )) {
                    const ref = refs[target];
                    if (ref) names[ref] = name;
                }
            }
        }

        return names;
    }

    private async replaceGeneral(
        deviceId: string,
        isNewsEnabled: boolean,
        credentials: PushDeviceCredentials,
        signature: string
    ): Promise<void> {
        this.deps.logger.info('push_subscription.replace_general', { isNewsEnabled });
        if (isNewsEnabled) {
            await this.deps.api.replaceGeneral(deviceId, { news: true }, credentials);
        } else {
            await this.deps.api.deleteGeneral(deviceId);
        }
        this.lastSent.set(GENERAL_KEY, signature);
    }

    private async replaceGroup(
        deviceId: string,
        accountId: string,
        group: SubscriptionGroup,
        credentials: PushDeviceCredentials,
        signature: string
    ): Promise<void> {
        const groupId = await this.reserveGroupId(accountId);
        this.deps.logger.info('push_subscription.replace_group', { accountId, groupId });
        this.targetRefs.set(
            accountId,
            await this.deps.api.replaceGroup(deviceId, groupId, group, credentials)
        );
        this.lastSent.set(accountId, signature);
    }

    private async replaceSync(
        deviceId: string,
        accountId: string,
        credentials: PushDeviceCredentials,
        signature: string
    ): Promise<void> {
        const syncId = deriveNotificationSyncId(accountId);
        const syncIds = (await this.readIds('syncIds')) ?? {};
        if (syncIds[accountId] !== syncId) {
            await this.write('syncIds', { ...syncIds, [accountId]: syncId });
        }

        this.deps.logger.info('push_subscription.replace_sync', { accountId });
        await this.deps.api.replaceSync(deviceId, syncId, SYNC_SUBSCRIPTION, credentials);
        this.lastSent.set(this.getSyncKey(accountId), signature);
    }

    private async deleteSync(deviceId: string, accountId: string): Promise<void> {
        const syncIds = (await this.readIds('syncIds')) ?? {};
        const { [accountId]: syncId, ...rest } = syncIds;
        if (!syncId) return;

        this.deps.logger.info('push_subscription.delete_sync', { accountId });
        await this.deps.api.deleteSync(deviceId, syncId);
        await this.write('syncIds', rest);
        this.lastSent.delete(this.getSyncKey(accountId));
    }

    private async deleteGroup(deviceId: string, accountId: string): Promise<void> {
        const groupIds = (await this.readIds('groupIds')) ?? {};
        const { [accountId]: groupId, ...rest } = groupIds;
        if (!groupId) return;

        this.deps.logger.info('push_subscription.delete_group', { accountId, groupId });
        await this.deps.api.deleteGroup(deviceId, groupId);
        await this.write('groupIds', rest);
        this.lastSent.delete(accountId);
        this.targetRefs.delete(accountId);
    }

    private async resetDevice(): Promise<void> {
        const deviceId = await this.read('deviceId');
        if (!deviceId) return;

        try {
            this.deps.logger.info('push_subscription.delete_device', { deviceId });
            await this.deps.api.deleteDevice(deviceId);
            await this.storage.removeItem('groupIds');
            await this.storage.removeItem('syncIds');
            await this.storage.removeItem('deviceId');
        } finally {
            this.lastSent.clear();
            this.targetRefs.clear();
            this.lastWalletNames = '';
            await this.attempt('wallet_names', () =>
                this.deps.pushNotifications.setWalletNames({})
            );
        }
    }

    private async reserveGroupId(accountId: string): Promise<string> {
        const groupIds = (await this.readIds('groupIds')) ?? {};
        const existing = groupIds[accountId];
        if (existing) return existing;

        const groupId = uuid4();
        await this.write('groupIds', { ...groupIds, [accountId]: groupId });

        return groupId;
    }

    private async resolvePushToken(): Promise<string | null> {
        try {
            return await this.deps.pushNotifications.getPushToken();
        } catch (e) {
            this.deps.logger.error('push_subscription.push_token_failed', e);

            return null;
        }
    }

    private async resolveDeviceId(): Promise<string> {
        const stored = await this.read('deviceId');
        if (stored) return stored;

        const deviceId = uuid4();
        await this.write('deviceId', deviceId);

        return deviceId;
    }

    private getSyncKey(accountId: string): string {
        return `sync:${accountId}`;
    }

    private async readIds(
        key: Extract<StorageKey, 'groupIds' | 'syncIds'>
    ): Promise<Record<string, string> | null> {
        try {
            return (await this.read(key)) ?? {};
        } catch (e) {
            this.deps.logger.error(`push_subscription.${key}_corrupted`, e);

            return null;
        }
    }

    private async attempt(operation: string, run: () => Promise<void>): Promise<number> {
        try {
            await run();

            return 0;
        } catch (e) {
            this.deps.logger.error(`push_subscription.${operation}_failed`, e);

            return 1;
        }
    }

    private scheduleRetry(input: PushSyncInput): void {
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            void this.sync(input);
        }, RETRY_DELAY_MS);
    }

    private cancelRetry(): void {
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = null;
    }

    private async read<K extends StorageKey>(key: K): Promise<StoredValue<K>> {
        const raw = await this.storage.getItem(key);
        const json: unknown = raw === null ? null : JSON.parse(raw);

        return pushSubscriptionStorageStructure[key].parse(json) as StoredValue<K>;
    }

    private write<K extends StorageKey>(key: K, value: StoredValue<K>): Promise<void> {
        return this.storage.setItem(key, JSON.stringify(value));
    }
}
