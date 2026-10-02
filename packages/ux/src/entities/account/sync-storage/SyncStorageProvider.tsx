import { useQueryClient } from '@tanstack/react-query';
import type { FC, PropsWithChildren } from 'react';
import { useEffect } from 'react';

import { accountStore, accountStoreActions, SYNCED_SLOT_KEYS } from './account-store';
import { useAccountStoreTransformFactory, useAttachAccountsToStore } from './useAccountStoreSync';
import { useAppState } from '../../../shared/app/useAppState';
import { useDeviceSyncStateChecker } from '../../synced-device/device-sync-state';
import { useAccounts } from '../account-state';
import { accountKey } from '../keys';

function useSyncObserver() {
    const accounts = useAccounts();
    const queryClient = useQueryClient();
    const createTransform = useAccountStoreTransformFactory();
    const attachAccountsToStore = useAttachAccountsToStore();

    useEffect(() => {
        if (accounts.length === 0) {
            accountStoreActions.clear();
            return;
        }

        const unsubscribes = accounts.flatMap(account => {
            const transform = createTransform(account);

            return SYNCED_SLOT_KEYS.map(key =>
                account.syncProvider.onChange(key, () => {
                    const slotJson = account.syncProvider.get(key);
                    const prev = accountStore.getState().accountsData.get(account.accountId);
                    const next = transform.restore(key, slotJson, prev ?? null);
                    accountStoreActions.setSlot(account.accountId, key, next);

                    if (key === 'portfolios') {
                        queryClient.invalidateQueries({
                            queryKey: accountKey
                                .accountId(account.accountId)
                                .activePortfolio.toKey()
                        });
                    }
                })
            );
        });

        attachAccountsToStore(accounts);

        return () => {
            unsubscribes.forEach(fn => fn());
        };
    }, [accounts, queryClient, createTransform, attachAccountsToStore]);
}

function useSyncRestartOnForeground() {
    const accounts = useAccounts();
    const { current, previous } = useAppState();

    useEffect(() => {
        if (previous === 'inactive' || (previous === 'background' && current === 'active')) {
            accounts.forEach(a => a.syncProvider.restart());
        }
    }, [accounts, current, previous]);
}

export const SyncStorageProvider: FC<PropsWithChildren> = ({ children }) => {
    useSyncObserver();
    useDeviceSyncStateChecker();
    useSyncRestartOnForeground();

    return <>{children}</>;
};
