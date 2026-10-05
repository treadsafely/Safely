import type { StoreApi } from 'zustand/vanilla';
import { createStore } from 'zustand/vanilla';

import type { Contact, FiatAsset, Portfolio } from '@safely/core';
import type {
    SAccountMeta,
    SAmountDisplay,
    SDevicesMeta,
    SDevicesArchive,
    SDevicesSyncState,
    SNextDerivingPortfolioInfo,
    SNotifications
} from '@safely/sync-storage';

export type AccountStoreData = {
    accountId: string;
    meta: SAccountMeta;
    portfolios: Portfolio[];
    contacts: Contact[];
    preferredFiat: FiatAsset | null;
    devicesMeta: SDevicesMeta;
    devicesSyncState: SDevicesSyncState;
    devicesArchive: SDevicesArchive;
    nextDerivingPortfolioInfo: SNextDerivingPortfolioInfo;
    analyticsId: string | null;
    amountDisplay: SAmountDisplay;
    notifications: SNotifications;
};

export const SYNCED_SLOT_KEYS = [
    'meta',
    'portfolios',
    'contacts',
    'preferredFiat',
    'devicesMeta',
    'devicesSyncState',
    'devicesArchive',
    'nextDerivingPortfolioInfo',
    'analyticsId',
    'amountDisplay',
    'notifications'
] as const satisfies readonly (keyof Omit<AccountStoreData, 'accountId'>)[];

export type SyncedSlotKey = (typeof SYNCED_SLOT_KEYS)[number];

export type AccountState = {
    accountsData: ReadonlyMap<string, AccountStoreData>;
};

export type AccountStore = StoreApi<AccountState>;

export function createAccountStore(): AccountStore {
    return createStore<AccountState>(() => ({
        accountsData: new Map()
    }));
}

export const accountStore: AccountStore = createAccountStore();

export type AccountStoreActions = {
    attachAll(snapshots: readonly AccountStoreData[]): void;
    setSlot<K extends SyncedSlotKey>(accountId: string, key: K, value: AccountStoreData[K]): void;
    clear(): void;
};

export const accountStoreActions: AccountStoreActions = {
    attachAll(snapshots) {
        accountStore.setState({
            accountsData: new Map(snapshots.map(snapshot => [snapshot.accountId, snapshot]))
        });
    },

    setSlot(accountId, key, value) {
        accountStore.setState(state => {
            const current = state.accountsData.get(accountId);
            if (!current) return state;
            const next = new Map(state.accountsData);
            next.set(accountId, { ...current, [key]: value });
            return { accountsData: next };
        });
    },

    clear() {
        accountStore.setState({ accountsData: new Map() });
    }
};
