import { useNavigation } from '@react-navigation/core';
import { CommonActions, StackActions } from '@react-navigation/native';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { PortfolioLedger, PortfolioMeta } from '@safely/core';
import { PortfolioIdLedger, PortfolioNetworkType, PortfolioType } from '@safely/core';
import {
    useAddLedgerPortfolio,
    useLedgerAccounts,
    useLedgerAccountSelection,
    useLedgerSession,
    usePortfolios,
    useSecurityCheck,
    useSetActivePortfolio,
    useToast,
    useUpdateLedgerDerivations
} from '@safely/ux';

import { handleDuplicatePortfolio } from '@mobile/features/add-wallet/handleDuplicatePortfolio';
import { getLedgerWalletName, useExitToConnectLedger } from '@mobile/features/ledger';

import { LedgerImportAccountsView } from './LedgerImportAccountsView';

export const LedgerImportAccountsScreen = () => {
    const toast = useToast();
    const { t } = useTranslation();
    const navigation = useNavigation();
    const check = useSecurityCheck();
    const { mutateAsync: addLedgerPortfolio } = useAddLedgerPortfolio();
    const { mutateAsync: setActivePortfolio } = useSetActivePortfolio();
    const { mutateAsync: updateLedgerDerivations } = useUpdateLedgerDerivations();

    const { findMorePortfolioId, selectedDevice } = useLedgerSession();
    const exitToConnect = useExitToConnectLedger();
    const portfolios = usePortfolios();

    const defaultName = getLedgerWalletName(
        selectedDevice?.deviceModel.model,
        portfolios.length + 1
    );

    const findMorePortfolio = useMemo(
        () =>
            findMorePortfolioId
                ? (portfolios.find(
                      p =>
                          p.id.toString() === findMorePortfolioId && p.type === PortfolioType.LEDGER
                  ) as PortfolioLedger | undefined)
                : undefined,
        [portfolios, findMorePortfolioId]
    );

    const { accounts, balances, masterFingerprint, retry, isError, isTimedOut } =
        useLedgerAccounts();

    const existingPortfolio = useMemo<PortfolioLedger | undefined>(
        () =>
            masterFingerprint
                ? (portfolios.find(
                      p =>
                          p.type === PortfolioType.LEDGER &&
                          p.networkType === PortfolioNetworkType.MAINNET &&
                          p.masterFingerprint.equals(masterFingerprint)
                  ) as PortfolioLedger | undefined)
                : undefined,
        [portfolios, masterFingerprint]
    );

    const targetPortfolio = findMorePortfolio ?? existingPortfolio;

    const existingIndexes = useMemo(
        () => existingPortfolio?.getDerivations().map(d => d.index) ?? [],
        [existingPortfolio]
    );

    const { selectedIndexes, selectedAccounts, toggle } = useLedgerAccountSelection({
        accounts,
        balances,
        preselectedIndexes: existingIndexes
    });

    const existingNames = useMemo(
        () => new Map(targetPortfolio?.getDerivations().map(d => [d.index, d.meta.name]) ?? []),
        [targetPortfolio]
    );

    const isDerived = accounts.length > 0;
    const showRetry = isError || isTimedOut;

    const handleContinue = useCallback(() => {
        if (!masterFingerprint) {
            return;
        }

        if (targetPortfolio) {
            if (
                findMorePortfolio &&
                !masterFingerprint.equals(findMorePortfolio.masterFingerprint)
            ) {
                toast(t('addWallet.connectLedger.importAccounts.wrongDevice'));
                return;
            }

            navigation.dispatch(
                CommonActions.navigate('CustomizeWalletModal', {
                    hasBackButton: true,
                    defaultName: targetPortfolio.meta.name,
                    defaultIcon: targetPortfolio.meta.icon,
                    title: t('customizeWallet.ledgerTitle'),
                    onSave: async (meta: PortfolioMeta) => {
                        await check();

                        await updateLedgerDerivations({
                            portfolio: targetPortfolio,
                            accounts: selectedAccounts,
                            meta
                        });

                        await setActivePortfolio({ id: targetPortfolio.id });

                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'TabsNavigator' }]
                            })
                        );
                    },
                    onClose: () => {
                        navigation.goBack();
                    }
                })
            );

            return;
        }

        const defaultIcon = new PortfolioIdLedger({
            masterFingerprint: masterFingerprint.toString('hex'),
            networkType: PortfolioNetworkType.MAINNET
        }).getFallbackEmoji();

        navigation.dispatch(
            CommonActions.navigate('CustomizeWalletModal', {
                hasBackButton: true,
                defaultName,
                defaultIcon,
                title: t('customizeWallet.ledgerTitle'),
                onSave: async (meta: PortfolioMeta) => {
                    await check();

                    try {
                        await addLedgerPortfolio({
                            masterFingerprint,
                            deviceModel: selectedDevice?.deviceModel.model ?? '',
                            accounts: selectedAccounts,
                            meta
                        });

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
    }, [
        findMorePortfolio,
        targetPortfolio,
        check,
        masterFingerprint,
        navigation,
        addLedgerPortfolio,
        updateLedgerDerivations,
        setActivePortfolio,
        selectedAccounts,
        selectedDevice,
        defaultName,
        toast,
        t
    ]);

    const handleRetry = useCallback(async () => {
        const recovered = await retry();

        if (!recovered) {
            navigation.dispatch(StackActions.popToTop());
        }
    }, [retry, navigation]);

    return (
        <LedgerImportAccountsView
            accounts={accounts}
            balances={balances}
            selectedIndexes={selectedIndexes}
            existingNames={existingNames}
            isDerived={isDerived}
            showRetry={showRetry}
            isContinueDisabled={!showRetry && (!isDerived || selectedIndexes.size === 0)}
            onToggle={toggle}
            onPrimary={showRetry ? handleRetry : handleContinue}
            onBack={exitToConnect}
        />
    );
};
