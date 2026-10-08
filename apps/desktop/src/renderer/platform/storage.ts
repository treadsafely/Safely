import type { IEnumerableStorage, ISyncKeyValueStorage } from '@safely/core';

import type { DesktopStoreBridge } from '../../shared/bridge';

export function createEnumerableStorage(store: DesktopStoreBridge): IEnumerableStorage {
    return {
        getItem: key => store.get(key),
        setItem: (key, value) => store.set(key, value),
        removeItem: key => store.remove(key),
        clear: () => store.clear(),
        getAllKeys: () => store.keys(''),
        getKeysWithPrefix: prefix => store.keys(prefix),
        removeItemsWithPrefix: prefix => store.removeWithPrefix(prefix)
    };
}

const SYNCHRONOUS_PREFIX = 'safely:';

/**
 * Read before React mounts, so it cannot go through asynchronous IPC. `localStorage` is the only
 * synchronous store a sandboxed renderer has; nothing secret is kept here.
 */
export const synchronousStorage: ISyncKeyValueStorage = {
    get: key => localStorage.getItem(SYNCHRONOUS_PREFIX + key),
    set: (key, value) => localStorage.setItem(SYNCHRONOUS_PREFIX + key, value),
    remove: key => {
        localStorage.removeItem(SYNCHRONOUS_PREFIX + key);
    },
    clear: () => {
        /* only our own keys: the origin may hold unrelated browser state */
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(SYNCHRONOUS_PREFIX)) {
                localStorage.removeItem(key);
            }
        }
    }
};
