import { useMutation } from '@tanstack/react-query';

import type { AccountPortfolioSource } from '../../entities';
import { useCreateAccount, useLoader, useToast } from '../../entities';
import { useAppContext, useTranslate } from '../../shared';

export function useCreateAccountFromSource() {
    const t = useTranslate();
    const toast = useToast();
    const { withLoader } = useLoader();
    const { mutateAsync: createAccount } = useCreateAccount({ setActive: true });
    const {
        storage: {
            sync: { getSecureEncrypted }
        }
    } = useAppContext();

    /* the unlock stays outside withLoader: the overlay would cover the security prompt */
    return useMutation<void, Error, { name: string; source: AccountPortfolioSource }>({
        async mutationFn({ name, source }) {
            using secureEncryptedStorage = getSecureEncrypted();
            await secureEncryptedStorage.unlock();

            await withLoader(() =>
                createAccount({ name, secureEncryptedStorage, firstPortfolio: source })
            );
        },
        onSuccess() {
            toast(t('addAccount.toastAccountCreated'));
        }
    });
}
