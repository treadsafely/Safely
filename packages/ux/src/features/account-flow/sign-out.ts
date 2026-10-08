import { useCallback } from 'react';

import { SyncStatus } from '@safely/sync';

import { useAccounts, useActiveAccount } from '../../entities';

export type SignOutPlan = {
    isSynced: boolean;
    shouldDeleteAccount: boolean;
    shouldEraseAllData: boolean;
    toastKey: string | null;
};

export function resolveSignOutPlan(params: {
    isLastAccount: boolean;
    isSynced: boolean;
}): SignOutPlan {
    const { isLastAccount, isSynced } = params;

    return {
        isSynced,
        shouldDeleteAccount: !isLastAccount,
        shouldEraseAllData: isLastAccount,
        toastKey: isLastAccount ? null : 'settings.signOutAccount.toastAccountRemoved'
    };
}

export function useResolveSignOutPlan(): () => SignOutPlan {
    const accounts = useAccounts();
    const account = useActiveAccount();

    return useCallback(
        () =>
            resolveSignOutPlan({
                isLastAccount: accounts?.length === 1,
                isSynced: account.syncProvider.syncStatusManager.getStatus() !== SyncStatus.OFFLINE
            }),
        [accounts, account]
    );
}

export type SignOutCopy = {
    subtitleKey: string;
    checkboxKey?: string;
};

export function resolveSignOutCopy(hasLinkedDevices: boolean): SignOutCopy {
    if (hasLinkedDevices) {
        return { subtitleKey: 'settings.signOutAccount.sheet.fullCopy.subtitle' };
    }

    return {
        subtitleKey: 'settings.signOutAccount.sheet.noDevices.subtitle',
        checkboxKey: 'settings.signOutAccount.sheet.noDevices.checkbox'
    };
}
