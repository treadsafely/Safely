import { useNavigation } from '@react-navigation/core';
import { CommonActions } from '@react-navigation/native';
import { useCallback } from 'react';

import type { PortfolioMeta } from '@safely/core';
import { PortfolioAlreadyExistsError, PortfolioNetworkType } from '@safely/core';
import {
    resolveWatchOnlyPortfolio,
    useAddPortfolioFromSource,
    useNewPortfolioFallbackName,
    usePortfolios
} from '@safely/ux';

import { WatchOnlyAddressForm } from '@mobile/features/add-wallet';
import { handleDuplicatePortfolio } from '@mobile/features/add-wallet/handleDuplicatePortfolio';

export const AddWatchOnlyScreen = () => {
    const navigation = useNavigation();
    const portfolios = usePortfolios();
    const { mutateAsync: addPortfolioFromSource } = useAddPortfolioFromSource();
    const defaultPortfolioName = useNewPortfolioFallbackName();

    const handleSubmit = useCallback(
        (input: string) => {
            const resolution = resolveWatchOnlyPortfolio(
                input,
                PortfolioNetworkType.MAINNET,
                portfolios
            );

            if (resolution.kind === 'duplicate') {
                handleDuplicatePortfolio(
                    new PortfolioAlreadyExistsError(resolution.portfolio),
                    navigation
                );

                return;
            }

            navigation.navigate('CustomizeWalletModal', {
                hasBackButton: true,
                defaultName: defaultPortfolioName,
                defaultIcon: resolution.icon,
                onSave: async (meta: PortfolioMeta) => {
                    try {
                        await addPortfolioFromSource({
                            source: {
                                kind: 'watchOnly',
                                input,
                                networkType: PortfolioNetworkType.MAINNET
                            },
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
                }
            });
        },
        [portfolios, navigation, addPortfolioFromSource, defaultPortfolioName]
    );

    return (
        <WatchOnlyAddressForm networkType={PortfolioNetworkType.MAINNET} onSubmit={handleSubmit} />
    );
};
