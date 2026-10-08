import { useNavigation } from '@react-navigation/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
    useActiveAccountMeta,
    useAppContext,
    useDeleteAccount,
    useEraseAllData,
    useActiveAccount,
    usePushSubscriptionSyncer,
    useResolveSignOutPlan,
    useToast
} from '@safely/ux';

export function useSignOutAccountConfirmation() {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const activeAccount = useActiveAccount();
    const accountName = useActiveAccountMeta().name;
    const toast = useToast();
    const resolvePlan = useResolveSignOutPlan();
    const { mutateAsync: deleteAccount } = useDeleteAccount();
    const { mutateAsync: eraseAllData } = useEraseAllData();
    const { storage } = useAppContext();
    const pushSubscriptionSyncer = usePushSubscriptionSyncer();

    return useCallback(() => {
        const plan = resolvePlan();

        navigation.navigate('SignOutAccountSheet', {
            accountName,
            withLoader: plan.isSynced,
            onConfirm: async () => {
                if (plan.shouldDeleteAccount) {
                    using secureEncryptedStorage = storage.sync.getSecureEncrypted();
                    await secureEncryptedStorage.unlock();

                    if (plan.isSynced) {
                        await pushSubscriptionSyncer?.announceSyncEvent(
                            activeAccount.accountId,
                            'device-disconnected'
                        );
                    }

                    await deleteAccount(secureEncryptedStorage);
                }

                if (plan.shouldEraseAllData) {
                    await eraseAllData();
                }

                if (plan.toastKey !== null) {
                    toast(t(plan.toastKey));
                }
            }
        });
    }, [
        navigation,
        accountName,
        resolvePlan,
        activeAccount,
        deleteAccount,
        eraseAllData,
        toast,
        t,
        storage.sync.getSecureEncrypted,
        pushSubscriptionSyncer
    ]);
}
