import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { NotificationEventKey } from '@safely/core';
import { NotificationSettings } from '@safely/core';

import { useActiveAccountStoreSlot, useActiveAccountSyncStorageSlotUpdate } from '../account';
import { usePortfolios } from '../portfolio';

export function useNotificationSettings(): NotificationSettings {
    const stored = useActiveAccountStoreSlot('notifications');

    return useMemo(() => NotificationSettings.fromStored(stored), [stored]);
}

export function useSetNotificationsEnabled() {
    const update = useActiveAccountSyncStorageSlotUpdate('notifications');

    return useMutation({
        mutationFn: (isEnabled: boolean) => update(draft => draft.set('enabled', isEnabled))
    });
}

export function useSetAllWalletsNotifications() {
    const update = useActiveAccountSyncStorageSlotUpdate('notifications');

    return useMutation({
        mutationFn: (params: { isEnabled: boolean; selectedPortfolioIds: string[] }) =>
            update(draft => {
                draft.set('allWallets', params.isEnabled);
                if (!params.isEnabled) {
                    draft.set(
                        'portfolioIds',
                        Object.fromEntries(params.selectedPortfolioIds.map(id => [id, true]))
                    );
                }
            })
    });
}

export function useSetPortfolioNotificationsSelected() {
    const portfolios = usePortfolios();
    const settings = useNotificationSettings();
    const update = useActiveAccountSyncStorageSlotUpdate('notifications');

    return useMutation({
        mutationFn: (params: { portfolioId: string; isSelected: boolean }) =>
            update(draft => {
                if (settings.allWallets) {
                    draft.set('allWallets', false);
                    draft.set(
                        'portfolioIds',
                        Object.fromEntries(
                            portfolios
                                .map(portfolio => portfolio.id.toString())
                                .filter(id => id !== params.portfolioId || params.isSelected)
                                .map(id => [id, true])
                        )
                    );

                    return;
                }

                const entry = draft.entry('portfolioIds').orDefault({}).entry(params.portfolioId);
                if (params.isSelected) {
                    entry.set(true);
                } else {
                    entry.delete();
                }
            })
    });
}

export function useSetNotificationEventEnabled() {
    const update = useActiveAccountSyncStorageSlotUpdate('notifications');

    return useMutation({
        mutationFn: (params: { key: NotificationEventKey; isEnabled: boolean }) =>
            update(draft => draft.entry('events').orDefault({}).set(params.key, params.isEnabled))
    });
}
