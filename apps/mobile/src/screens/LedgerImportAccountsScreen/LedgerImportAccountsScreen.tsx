import { useNavigation } from '@react-navigation/core';
import { CommonActions, StackActions } from '@react-navigation/native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { PortfolioMeta } from '@safely/core';
import {
    getLedgerPortfolioDraft,
    useLedgerImport,
    useLedgerSession,
    usePortfolios,
    useSaveLedgerAccounts,
    useToast
} from '@safely/ux';

import { handleDuplicatePortfolio } from '@mobile/features/add-wallet/handleDuplicatePortfolio';
import { useExitToConnectLedger } from '@mobile/features/ledger';

import { LedgerImportAccountsView } from './LedgerImportAccountsView';

export const LedgerImportAccountsScreen = () => {
    const toast = useToast();
    const { t } = useTranslation();
    const navigation = useNavigation();
    const saveLedgerAccounts = useSaveLedgerAccounts();
    const { findMorePortfolioId } = useLedgerSession();
    const exitToConnect = useExitToConnectLedger();
    const portfolios = usePortfolios();

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

    const handleContinue = useCallback(() => {
        if (selection === null) {
            return;
        }

        if (isWrongDevice) {
            toast(t('addWallet.connectLedger.importAccounts.wrongDevice'));
            return;
        }

        const draft = getLedgerPortfolioDraft(selection, portfolios.length);

        navigation.dispatch(
            CommonActions.navigate('CustomizeWalletModal', {
                hasBackButton: true,
                defaultName: draft.name,
                defaultIcon: draft.icon,
                title: t('customizeWallet.ledgerTitle'),
                onSave: async (meta: PortfolioMeta) => {
                    try {
                        await saveLedgerAccounts(selection, meta);

                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'TabsNavigator' }]
                            })
                        );
                    } catch (error) {
                        handleDuplicatePortfolio(error, navigation);
                    }
                },
                onClose: () => {
                    navigation.goBack();
                }
            })
        );
    }, [selection, isWrongDevice, portfolios.length, navigation, saveLedgerAccounts, toast, t]);

    const handleRetry = useCallback(async () => {
        await retry();
        navigation.dispatch(StackActions.popToTop());
    }, [retry, navigation]);

    return (
        <LedgerImportAccountsView
            accounts={accounts}
            balances={balances}
            selectedIndexes={selectedIndexes}
            existingNames={existingNames}
            isDerived={isDerived}
            showRetry={isFailed}
            isContinueDisabled={isContinueDisabled}
            onToggle={toggle}
            onPrimary={isFailed ? handleRetry : handleContinue}
            onBack={exitToConnect}
        />
    );
};
