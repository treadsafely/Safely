import { useCallback } from 'react';

import type { PortfolioMeta } from '@safely/core';

import type { LedgerAccountsSelection } from './ledger-accounts-selection';
import {
    useAddLedgerPortfolio,
    useSetActivePortfolio,
    useUpdateLedgerDerivations
} from '../../entities';
import { useSecurityCheck } from '../../shared';

export type SaveLedgerAccounts = (
    selection: LedgerAccountsSelection,
    meta: PortfolioMeta
) => Promise<void>;

export const useSaveLedgerAccounts = (): SaveLedgerAccounts => {
    const check = useSecurityCheck();
    const { mutateAsync: addLedgerPortfolio } = useAddLedgerPortfolio();
    const { mutateAsync: setActivePortfolio } = useSetActivePortfolio();
    const { mutateAsync: updateLedgerDerivations } = useUpdateLedgerDerivations();

    return useCallback(
        async (selection, meta) => {
            const { masterFingerprint, deviceModel, accounts, targetPortfolio } = selection;

            await check();

            if (targetPortfolio === undefined) {
                await addLedgerPortfolio({ masterFingerprint, deviceModel, accounts, meta });

                return;
            }

            await updateLedgerDerivations({ portfolio: targetPortfolio, accounts, meta });
            await setActivePortfolio({ id: targetPortfolio.id });
        },
        [check, addLedgerPortfolio, updateLedgerDerivations, setActivePortfolio]
    );
};
