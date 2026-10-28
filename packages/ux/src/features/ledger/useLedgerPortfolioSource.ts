import { useCallback } from 'react';

import type { LedgerAccountsSelection } from './ledger-accounts-selection';
import type { AccountPortfolioSource } from '../../entities';
import { getLedgerDerivationName, getLedgerWalletName } from '../../entities';
import { useTranslate } from '../../shared';

export type LedgerPortfolioSource = Extract<AccountPortfolioSource, { kind: 'ledger' }>;

export const useLedgerPortfolioSource = () => {
    const t = useTranslate();

    return useCallback(
        (selection: Omit<LedgerAccountsSelection, 'targetPortfolio'>): LedgerPortfolioSource => ({
            kind: 'ledger',
            masterFingerprint: selection.masterFingerprint.toString('hex'),
            deviceModel: selection.deviceModel,
            walletName: getLedgerWalletName(selection.deviceModel, 1),
            accounts: selection.accounts.map(account => ({
                ...account,
                name: getLedgerDerivationName(t, account.index)
            }))
        }),
        [t]
    );
};
