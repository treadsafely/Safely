import { useCallback, useMemo } from 'react';
import type z from 'zod';
export * from './schemas';
export * from './active-portfolio';

import type { ITreeStorage } from '@safely/core';

import type { AccountLocalStorageStructure } from './schemas';
import { accountLocalStorageStructure } from './schemas';
import { useAppContext } from '../../../shared';
import { useActiveAccountQuery } from '../account-state';

export class AccountLocalStorage {
    private readonly storage: ITreeStorage;

    constructor(root: ITreeStorage, accountId: string) {
        this.storage = root.child(['account', accountId]);
    }

    public async get<K extends keyof AccountLocalStorageStructure>(
        key: K
    ): Promise<z.output<AccountLocalStorageStructure[K]>> {
        const data = (await this.storage.getItem(key)) ?? null;
        const structData: unknown = data === null ? null : JSON.parse(data);

        return accountLocalStorageStructure[key].parse(structData) as z.output<
            AccountLocalStorageStructure[K]
        >;
    }

    public set<K extends keyof AccountLocalStorageStructure>(
        key: K,
        val: z.input<AccountLocalStorageStructure[K]>
    ): Promise<void> {
        accountLocalStorageStructure[key].parse(val);

        return this.storage.setItem(key, JSON.stringify(val));
    }

    public remove(key: keyof AccountLocalStorageStructure): Promise<void> {
        return this.storage.removeItem(key);
    }

    public clear(): Promise<void> {
        return this.storage.clear();
    }
}

export function useAccountLocalStorageFactory() {
    const {
        storage: { ux }
    } = useAppContext();

    return useCallback(
        (accountId: string) => new AccountLocalStorage(ux.regular, accountId),
        [ux.regular]
    );
}

function useActiveAccountLocalStorageInstance() {
    const createStorage = useAccountLocalStorageFactory();
    const activeAccountId = useActiveAccountQuery().data?.accountId;

    return useMemo(
        () => (activeAccountId ? createStorage(activeAccountId) : null),
        [createStorage, activeAccountId]
    );
}

export function useActiveAccountLocalStorage<K extends keyof AccountLocalStorageStructure>(key: K) {
    const storage = useActiveAccountLocalStorageInstance();

    const set = useCallback<(val: z.input<AccountLocalStorageStructure[K]>) => Promise<void>>(
        val => {
            if (!storage) {
                throw new Error('Cannot set data to uninitialized storage');
            }
            return storage.set(key, val);
        },
        [storage, key]
    );

    const remove = useCallback<() => Promise<void>>(() => {
        if (!storage) {
            throw new Error('Cannot remove data from uninitialized storage');
        }
        return storage.remove(key);
    }, [storage, key]);

    const get = useCallback<() => Promise<z.output<AccountLocalStorageStructure[K]>>>(async () => {
        if (!storage) {
            return accountLocalStorageStructure[key].parse(null) as z.output<
                AccountLocalStorageStructure[K]
            >;
        }
        return storage.get(key);
    }, [storage, key]);

    return { get, set, remove };
}

export function useClearActiveAccountLocalStorage() {
    const storage = useActiveAccountLocalStorageInstance();

    return useCallback(() => {
        if (!storage) {
            throw new Error('Cannot clear data from uninitialized storage');
        }
        return storage.clear();
    }, [storage]);
}
