import { useCallback } from 'react';

import {
    SecurityCheckCancelledError,
    useAppContext,
    useDeleteAccount,
    useEraseAllData,
    useErrorToast,
    useLoader,
    useResolveSignOutPlan,
    useToast,
    useTranslate
} from '@safely/ux';

export function useSignOut() {
    const resolvePlan = useResolveSignOutPlan();
    const { mutateAsync: deleteAccount } = useDeleteAccount();
    const { mutateAsync: eraseAllData } = useEraseAllData();
    const { withLoader } = useLoader();
    const errorToast = useErrorToast({});
    const toast = useToast();
    const t = useTranslate();
    const {
        storage: {
            sync: { getSecureEncrypted }
        }
    } = useAppContext();

    return useCallback(async () => {
        const plan = resolvePlan();

        try {
            if (plan.shouldDeleteAccount) {
                using secureEncryptedStorage = getSecureEncrypted();

                await secureEncryptedStorage.unlock();
                await withLoader(() => deleteAccount(secureEncryptedStorage));
            }

            if (plan.shouldEraseAllData) {
                await withLoader(() => eraseAllData());
            }

            if (plan.toastKey !== null) {
                toast({ message: t(plan.toastKey) });
            }
        } catch (error) {
            if (error instanceof SecurityCheckCancelledError) {
                return;
            }

            errorToast(error);
        }
    }, [
        resolvePlan,
        withLoader,
        getSecureEncrypted,
        deleteAccount,
        eraseAllData,
        toast,
        t,
        errorToast
    ]);
}
