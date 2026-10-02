import { useCallback } from 'react';

import type { ISyncAccount } from '@safely/sync';
import type { SyncedStorageStructure } from '@safely/sync-storage';

import { accountStore, accountStoreActions } from './account-store';
import { AccountStoreTransform } from './account-store-transform';
import { SecretEncryptor, useAppContext } from '../../../shared';
import { useLedgerSessionPort } from '../../ledger';

type Account = ISyncAccount<SyncedStorageStructure>;

export function useAccountStoreTransformFactory() {
    const { storage } = useAppContext();
    const ledgerSessionPort = useLedgerSessionPort();

    return useCallback(
        (account: Account) =>
            new AccountStoreTransform(
                () =>
                    new SecretEncryptor(account.secretEncryptor, storage.sync.getSecureEncrypted()),
                () => ledgerSessionPort
            ),
        [storage.sync, ledgerSessionPort]
    );
}

export function useAttachAccountsToStore() {
    const createTransform = useAccountStoreTransformFactory();

    return useCallback(
        (accounts: readonly Account[]) => {
            const current = accountStore.getState().accountsData;

            accountStoreActions.attachAll(
                accounts.map(account =>
                    createTransform(account).restoreAll(
                        account.accountId,
                        account.syncProvider.getAll(),
                        current.get(account.accountId) ?? null
                    )
                )
            );
        },
        [createTransform]
    );
}
