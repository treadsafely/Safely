import { useNavigation } from '@react-navigation/core';
import { StackActions } from '@react-navigation/native';
import { useCallback } from 'react';

import type { Portfolio } from '@safely/core';
import { useLedgerImport, useLedgerPortfolioSource } from '@safely/ux';

import { useExitToConnectLedger } from '@mobile/features/ledger';
import { useOnboardingFlow } from '@mobile/features/onboarding';
import { LedgerImportAccountsView } from '@mobile/screens/LedgerImportAccountsScreen/LedgerImportAccountsView';

const NO_PORTFOLIOS: Portfolio[] = [];

export const OnboardingLedgerImportScreen = () => {
    const exitToConnect = useExitToConnectLedger();
    const navigation = useNavigation();
    const { onLedgerReady } = useOnboardingFlow();
    const toLedgerPortfolioSource = useLedgerPortfolioSource();

    const {
        accounts,
        balances,
        selectedIndexes,
        isDerived,
        isFailed,
        isContinueDisabled,
        selection,
        toggle,
        retry
    } = useLedgerImport({ portfolios: NO_PORTFOLIOS, findMorePortfolioId: null });

    const handleContinue = useCallback(() => {
        if (selection === null) {
            return;
        }

        onLedgerReady(toLedgerPortfolioSource(selection));
    }, [selection, onLedgerReady, toLedgerPortfolioSource]);

    const handleRetry = useCallback(async () => {
        await retry();
        navigation.dispatch(StackActions.popToTop());
    }, [retry, navigation]);

    return (
        <LedgerImportAccountsView
            accounts={accounts}
            balances={balances}
            selectedIndexes={selectedIndexes}
            isDerived={isDerived}
            showRetry={isFailed}
            isContinueDisabled={isContinueDisabled}
            onToggle={toggle}
            onPrimary={isFailed ? handleRetry : handleContinue}
            onBack={exitToConnect}
        />
    );
};
