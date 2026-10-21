import { useCallback, useState } from 'react';

import type { PortfolioMeta } from '@safely/core';
import {
    SecurityCheckCancelledError,
    useActivePortfolioEntitiesQuery,
    useChangePortfolioMeta,
    useDeletePortfolio,
    useErrorToast,
    useLoader,
    useSetActivePortfolio,
    useToast,
    useTranslate
} from '@safely/ux';

export type WalletStep = 'select' | 'edit' | 'reveal' | 'remove';

export function useWalletFlow() {
    const toast = useToast();
    const t = useTranslate();
    const { withLoader } = useLoader();
    const errorToast = useErrorToast({});
    const { mutateAsync: deletePortfolio } = useDeletePortfolio();
    const { mutateAsync: setActivePortfolio } = useSetActivePortfolio();
    const { mutateAsync: changePortfolioMeta } = useChangePortfolioMeta();
    const portfolio = useActivePortfolioEntitiesQuery()?.data?.portfolio ?? null;

    const [step, setStep] = useState<WalletStep | null>(null);

    const close = useCallback(() => setStep(null), []);

    const openSelect = useCallback(() => setStep('select'), []);
    const openEdit = useCallback(() => setStep('edit'), []);
    const openReveal = useCallback(() => setStep('reveal'), []);
    const openRemove = useCallback(() => setStep('remove'), []);

    const select = useCallback(
        async (id: Parameters<typeof setActivePortfolio>[0]['id']) => {
            close();
            await setActivePortfolio({ id });
        },
        [close, setActivePortfolio]
    );

    const saveMeta = useCallback(
        async (meta: Pick<PortfolioMeta, 'name' | 'icon'>) => {
            if (portfolio === null) {
                return;
            }

            close();

            try {
                await changePortfolioMeta({ portfolio, meta });
            } catch (error) {
                errorToast(error);
            }
        },
        [close, changePortfolioMeta, portfolio, errorToast]
    );

    const remove = useCallback(async () => {
        if (portfolio === null) {
            return;
        }

        close();

        try {
            await withLoader(() => deletePortfolio(portfolio));
            toast(t('removeWallet.toastMessages.walletRemoved'));
        } catch (error) {
            if (!(error instanceof SecurityCheckCancelledError)) {
                errorToast(error);
            }
        }
    }, [close, withLoader, deletePortfolio, portfolio, toast, t, errorToast]);

    return {
        step,
        portfolio,
        close,
        openSelect,
        openEdit,
        openReveal,
        openRemove,
        select,
        saveMeta,
        remove
    };
}
