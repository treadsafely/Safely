import { app } from 'electron';
import path from 'node:path';

import { JsonStore } from './json-store';
import { KeychainStore } from './keychain-store';
import type { Store, StoreScope } from './types';

/**
 * Tied to the bundle id: an item is reachable only through this app's keychain access group, so
 * changing either a service or the bundle id abandons everything stored under it.
 */
const KEYCHAIN_SERVICE: Record<Exclude<StoreScope, 'regular'>, string> = {
    encrypted: 'com.safely.wallet-desktop.encrypted',
    secureEncrypted: 'com.safely.wallet-desktop.secureEncrypted'
};

let stores: Record<StoreScope, Store> | null = null;

/** Created after the app is ready: the path depends on `userData`. */
export function createStores(): void {
    stores = {
        regular: new JsonStore(path.join(app.getPath('userData'), 'store', 'regular.json')),
        encrypted: new KeychainStore(KEYCHAIN_SERVICE.encrypted),
        secureEncrypted: new KeychainStore(KEYCHAIN_SERVICE.secureEncrypted)
    };
}

export function getStore(scope: StoreScope): Store {
    if (!stores) {
        throw new Error('Stores are not initialised yet');
    }

    return stores[scope];
}

/* No flush counterpart on purpose: every write is already on disk before it resolves. */
export async function clearStores(): Promise<void> {
    if (!stores) {
        return;
    }

    await Promise.all(Object.values(stores).map(store => store.clear()));
}

export { KeychainError } from './keychain-store';
export type { Store, StoreScope } from './types';
