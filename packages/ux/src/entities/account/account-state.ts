import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { notNullish } from '@safely/core';
import type { ISyncAccount } from '@safely/sync';
import { SyncAccountFactory } from '@safely/sync';
import type {
    SAccountMeta,
    SyncedStorageStructure,
    SyncedStorageVersions
} from '@safely/sync-storage';
import { syncedStorageVersions } from '@safely/sync-storage';

import { accountKey } from './keys';
import type { AccountStoreData, SyncedSlotKey } from './sync-storage/account-store';
import { useAccountStoreSlot } from './sync-storage/useAccountStore';
import { useAttachAccountsToStore } from './sync-storage/useAccountStoreSync';
import {
    useAppContext,
    useBootConfig,
    useSharedUxStorage,
    useSuspenseQuery,
    useTranslate
} from '../../shared';

export type AccountMeta = Exclude<SAccountMeta, null>;

export type SyncAccount = ISyncAccount<SyncedStorageStructure>;

export type OnboardedAccount = {
    account: ISyncAccount<SyncedStorageStructure>;
    inviterIkPubHex: string | null;
};

export type OnboardingConnector = {
    connectionString: string;
    onboardedPromise: Promise<OnboardedAccount>;
    abort: () => void;
};

let _syncAccountFactory: SyncAccountFactory<SyncedStorageVersions> | null = null;

export function useAccountsFactory() {
    const config = useBootConfig();
    const {
        storage: { sync },
        logger
    } = useAppContext();

    if (!_syncAccountFactory) {
        _syncAccountFactory = new SyncAccountFactory({
            storage: sync.regular,
            encryptedStorage: sync.encrypted,
            versions: syncedStorageVersions,
            apiConfiguration: {
                basePath: config.sync.api_url
            },
            logger: logger.child('sync')
        });
    }

    return _syncAccountFactory;
}

export function useAccountsQueryConfig() {
    const factory = useAccountsFactory();
    const attachAccountsToStore = useAttachAccountsToStore();

    return {
        queryKey: accountKey.list.toKey(),
        async queryFn(): Promise<SyncAccount[]> {
            const accounts = await factory.getSyncAccounts();
            attachAccountsToStore(accounts);

            return accounts;
        },
        staleTime: Infinity
    };
}

export function useAccounts() {
    const query = useAccountsQueryConfig();

    return useSuspenseQuery(query).data;
}

export function useActiveAccountQuery() {
    const { set, get } = useSharedUxStorage('activeAccount');
    const client = useQueryClient();
    const accountsQueryConfig = useAccountsQueryConfig();

    return useSuspenseQuery({
        queryKey: accountKey.list.active.toKey(),
        async queryFn() {
            const activeId = await get();
            const accounts = await client.fetchQuery({ ...accountsQueryConfig, staleTime: 0 });
            let activeAccount = accounts.find(k => k.accountId === activeId);

            if (!activeAccount) {
                if (accounts.length === 0) {
                    return null;
                } else {
                    activeAccount = accounts[0];
                    await set(activeAccount.accountId);
                }
            }

            return activeAccount;
        },
        staleTime: Infinity
    });
}

export function useHasAccount() {
    const { data: activeAccount } = useActiveAccountQuery();
    return notNullish(activeAccount);
}

export function useActiveAccount() {
    const { data: activeAccount } = useActiveAccountQuery();
    if (activeAccount === null) {
        throw new Error('Account id not found');
    }

    return activeAccount;
}

export function useActiveAccountQueryKey() {
    const { data: activeAccount } = useActiveAccountQuery();
    return accountKey.accountId(activeAccount?.accountId);
}

export function useActiveAccountStoreSlot<K extends SyncedSlotKey>(
    key: K
): AccountStoreData[K] | undefined {
    const account = useActiveAccount();
    return useAccountStoreSlot(account.accountId, key);
}

export function useAccountMeta(accountId: string | null | undefined): AccountMeta {
    const stored = useAccountStoreSlot(accountId ?? null, 'meta');
    const t = useTranslate();
    return useMemo(() => stored ?? { name: t('account.unnamed') }, [stored, t]);
}

export function useActiveAccountMeta(): AccountMeta {
    return useAccountMeta(useActiveAccount().accountId);
}
