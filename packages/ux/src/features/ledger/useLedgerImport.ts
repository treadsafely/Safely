import type { Portfolio } from '@safely/core';

import type { LedgerAccountsSelection } from './ledger-accounts-selection';
import { useLedgerSession } from './LedgerSessionProvider';
import { useLedgerAccounts } from './useLedgerAccounts';
import { useLedgerAccountSelection } from './useLedgerAccountSelection';
import { useLedgerImportTarget } from './useLedgerImportTarget';

export const useLedgerImport = (params: {
    portfolios: Portfolio[];
    findMorePortfolioId: string | null;
}) => {
    const { portfolios, findMorePortfolioId } = params;

    const { selectedDevice } = useLedgerSession();
    const { accounts, balances, masterFingerprint, retry, isDerived, isFailed } =
        useLedgerAccounts();
    const { targetPortfolio, existingIndexes, existingNames, isWrongDevice } =
        useLedgerImportTarget({ portfolios, findMorePortfolioId, masterFingerprint });
    const { selectedIndexes, selectedAccounts, toggle } = useLedgerAccountSelection({
        accounts,
        balances,
        preselectedIndexes: existingIndexes
    });

    const selection: LedgerAccountsSelection | null =
        masterFingerprint === undefined
            ? null
            : {
                  masterFingerprint,
                  deviceModel: selectedDevice?.deviceModel.model ?? '',
                  accounts: selectedAccounts,
                  targetPortfolio
              };

    return {
        accounts,
        balances,
        selectedIndexes,
        existingNames,
        isDerived,
        isFailed,
        isContinueDisabled: !isFailed && (!isDerived || selectedIndexes.size === 0),
        isWrongDevice,
        selection,
        toggle,
        retry
    };
};
