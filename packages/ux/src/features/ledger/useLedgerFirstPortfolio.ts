import { useCallback } from 'react';

import type { LedgerAccountsSelection } from './ledger-accounts-selection';
import type { AccountPortfolioSource } from '../../entities';
import { getLedgerDerivationName, getLedgerWalletName } from '../../entities';
import { useTranslate } from '../../shared';

export type LedgerFirstPortfolio = {
    firstPortfolio: Extract<AccountPortfolioSource, { kind: 'ledger' }>;
    firstPortfolioName: string;
};

export const useLedgerFirstPortfolio = () => {
    const t = useTranslate();

    return useCallback(
        (selection: Omit<LedgerAccountsSelection, 'targetPortfolio'>): LedgerFirstPortfolio => ({
            firstPortfolio: {
                kind: 'ledger',
                masterFingerprint: selection.masterFingerprint.toString('hex'),
                deviceModel: selection.deviceModel,
                accounts: selection.accounts.map(account => ({
                    ...account,
                    name: getLedgerDerivationName(t, account.index)
                }))
            },
            firstPortfolioName: getLedgerWalletName(selection.deviceModel, 1)
        }),
        [t]
    );
};
