import { useNavigation } from '@react-navigation/core';
import { CommonActions } from '@react-navigation/native';
import { useCallback } from 'react';

import type { PortfolioMeta } from '@safely/core';
import { MnemonicResource, PortfolioNetworkType } from '@safely/core';
import {
    resolveGeneratedPortfolioIcon,
    resolveImportedPortfolio,
    useActiveAccountStoreSlot,
    useAddPortfolioFromSource,
    useNewPortfolioFallbackName,
    usePortfolios
} from '@safely/ux';

import { handleDuplicatePortfolio } from './handleDuplicatePortfolio';

const routes = {
    importWallet: 'ImportWalletModal',
    addWatchOnly: 'AddWatchOnlyModal',
    connectLedger: 'ConnectLedgerModal',
    customize: 'CustomizeWalletModal'
} as const;

export function useAddWalletFlow() {
    const navigation = useNavigation();
    const portfolios = usePortfolios();
    const { mutateAsync: addPortfolioFromSource } = useAddPortfolioFromSource();
    const nextGeneratingPortfolioInfo = useActiveAccountStoreSlot('nextDerivingPortfolioInfo');
    const defaultName = useNewPortfolioFallbackName();

    const resetToTabs = useCallback(() => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'TabsNavigator' }]
            })
        );
    }, [navigation]);

    const startCreateFlow = useCallback(() => {
        navigation.navigate(routes.customize, {
            defaultIcon: resolveGeneratedPortfolioIcon(nextGeneratingPortfolioInfo),
            defaultName,
            onSave: async (meta: PortfolioMeta) => {
                await addPortfolioFromSource({ source: { kind: 'generated' }, meta });

                resetToTabs();
            },
            onClose: () => {
                navigation.goBack();
            }
        });
    }, [navigation, addPortfolioFromSource, resetToTabs, nextGeneratingPortfolioInfo, defaultName]);

    const startImportFlow = useCallback(() => {
        navigation.dispatch(
            CommonActions.navigate(routes.importWallet, {
                networkType: PortfolioNetworkType.MAINNET
            })
        );
    }, [navigation]);

    const startTestnetImportFlow = useCallback(() => {
        navigation.dispatch(
            CommonActions.navigate(routes.importWallet, {
                networkType: PortfolioNetworkType.TESTNET
            })
        );
    }, [navigation]);

    const startWatchOnlyFlow = useCallback(() => {
        navigation.dispatch(CommonActions.navigate(routes.addWatchOnly));
    }, [navigation]);

    const startConnectLedgerFlow = useCallback(() => {
        navigation.dispatch(CommonActions.navigate(routes.connectLedger));
    }, [navigation]);

    const onMnemonicReady = useCallback(
        async (mnemonic: string[], networkType: PortfolioNetworkType) => {
            using accessor = new MnemonicResource(mnemonic);

            const resolution = await resolveImportedPortfolio(accessor, networkType, portfolios);

            if (resolution.kind === 'duplicate') {
                navigation.dispatch(
                    CommonActions.navigate('WalletAlreadyAddedModal', {
                        portfolio: resolution.portfolio
                    })
                );

                return;
            }

            navigation.navigate(routes.customize, {
                defaultIcon: resolution.icon,
                defaultName,
                onSave: async (meta: PortfolioMeta) => {
                    try {
                        using mnemonicAccessor = new MnemonicResource(mnemonic);

                        await addPortfolioFromSource({
                            source: { kind: 'imported', mnemonicAccessor, networkType },
                            meta
                        });

                        resetToTabs();
                    } catch (error) {
                        handleDuplicatePortfolio(error, navigation);
                    }
                },
                onClose: () => {
                    navigation.goBack();
                }
            });
        },
        [navigation, addPortfolioFromSource, resetToTabs, defaultName, portfolios]
    );

    return {
        startCreateFlow,
        startImportFlow,
        startWatchOnlyFlow,
        startConnectLedgerFlow,
        startTestnetImportFlow,
        onMnemonicReady
    };
}
