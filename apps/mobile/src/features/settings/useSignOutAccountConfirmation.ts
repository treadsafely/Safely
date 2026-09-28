import { useNavigation } from '@react-navigation/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { SyncStatus } from '@safely/sync';
import {
    useAccounts,
    useActiveAccount,
    useActiveAccountMeta,
    useAppContext,
    useDeleteAccount,
    useEraseAllData,
    usePushSubscriptionSyncer,
    useToast
} from '@safely/ux';

export function useSignOutAccountConfirmation() {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const accounts = useAccounts();
    const activeAccount = useActiveAccount();
    const accountName = useActiveAccountMeta().name;
    const toast = useToast();
    const { mutateAsync: deleteAccount } = useDeleteAccount();
    const { mutateAsync: eraseAllData } = useEraseAllData();
    const { storage } = useAppContext();
    const pushSubscriptionSyncer = usePushSubscriptionSyncer();

    return useCallback(() => {
        const isLastAccount = accounts?.length === 1;
        const isSyncAccount =
            activeAccount.syncProvider.syncStatusManager.getStatus() !== SyncStatus.OFFLINE;

        navigation.navigate('SignOutAccountSheet', {
            accountName,
            withLoader: isSyncAccount,
            onConfirm: async () => {
                using secureEncryptedStorage = storage.sync.getSecureEncrypted();
                await secureEncryptedStorage.unlock();

                if (isSyncAccount) {
                    await pushSubscriptionSyncer?.announceSyncEvent(
                        activeAccount.accountId,
                        'device-disconnected'
                    );
                }

                if (isLastAccount) {
                    if (isSyncAccount) {
                        await deleteAccount(secureEncryptedStorage);
                    }

                    await eraseAllData();
                } else {
                    await deleteAccount(secureEncryptedStorage);
                    toast(t('settings.signOutAccount.toastAccountRemoved'));
                }
            }
        });
    }, [
        navigation,
        accountName,
        accounts?.length,
        activeAccount,
        deleteAccount,
        eraseAllData,
        toast,
        t,
        storage.sync.getSecureEncrypted,
        pushSubscriptionSyncer
    ]);
}
