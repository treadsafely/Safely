import type { FC } from 'react';

import type { Portfolio } from '@safely/core';
import type { LedgerAccountsSelection } from '@safely/ux';
import { useLedgerImport, useToast, useTranslate } from '@safely/ux';

import { LedgerImportAccountsCard } from './LedgerImportAccountsCard';

export type LedgerImportAccountsProps = {
    hasBackdrop?: boolean;
    portfolios: Portfolio[];
    findMorePortfolioId: string | null;
    onContinue: (selection: LedgerAccountsSelection) => void;
    onRetry: () => void;
    onBack: () => void;
};

export const LedgerImportAccounts: FC<LedgerImportAccountsProps> = props => {
    const { hasBackdrop, portfolios, findMorePortfolioId, onContinue, onRetry, onBack } = props;

    const t = useTranslate();
    const toast = useToast();
    const {
        accounts,
        balances,
        selectedIndexes,
        existingNames,
        isDerived,
        isFailed,
        isContinueDisabled,
        isWrongDevice,
        selection,
        toggle,
        retry
    } = useLedgerImport({ portfolios, findMorePortfolioId });

    const handleContinue = (): void => {
        if (selection === null) {
            return;
        }

        if (isWrongDevice) {
            toast(t('addWallet.connectLedger.importAccounts.wrongDevice'));
            return;
        }

        onContinue(selection);
    };

    const handleRetry = async (): Promise<void> => {
        await retry();
        onRetry();
    };

    return (
        <LedgerImportAccountsCard
            hasBackdrop={hasBackdrop}
            accounts={accounts}
            balances={balances}
            selectedIndexes={selectedIndexes}
            existingNames={existingNames}
            isDerived={isDerived}
            showRetry={isFailed}
            isContinueDisabled={isContinueDisabled}
            onToggle={toggle}
            onPrimary={isFailed ? () => void handleRetry() : handleContinue}
            onBack={onBack}
        />
    );
};
