import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

const EMPTY: ReadonlySet<string> = new Set();

// A submitted transfer's inputs stay unspent in the scan until it confirms, so they are held back here
const pendingSpendsStore = createStore<Record<string, ReadonlySet<string>>>(() => ({}));

export function useFlamePendingSpends(walletId: string | undefined): ReadonlySet<string> {
    return useStore(pendingSpendsStore, state => (walletId && state[walletId]) || EMPTY);
}

export function addFlamePendingSpends(walletId: string, outputIds: string[]): void {
    pendingSpendsStore.setState(state => ({
        ...state,
        [walletId]: new Set([...(state[walletId] ?? []), ...outputIds])
    }));
}

export function releaseSettledFlameSpends(walletId: string, unspentIds: ReadonlySet<string>): void {
    const pending = pendingSpendsStore.getState()[walletId];
    if (!pending) return;

    const stillPending = [...pending].filter(id => unspentIds.has(id));
    if (stillPending.length === pending.size) return;

    pendingSpendsStore.setState(state => ({ ...state, [walletId]: new Set(stillPending) }));
}
