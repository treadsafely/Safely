import { useNavigation } from '@react-navigation/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useAnalytics, useFlag, useIsActivePortfolioWatchOnly, useScanQrScheme } from '@safely/ux';

import { TEST_ID } from '@mobile/shared/constants';
import { Actions } from '@mobile/shared/ui';
import { ArrowDown28, ArrowTop28, Plus28, QrCodeScan28 } from '@mobile/shared/ui/Icon';

import { styles } from './HomeActions.styles';

const WATCH_ONLY_OPACITY = 0.56;

export const HomeActions = () => {
    const { t } = useTranslation();
    const analytics = useAnalytics();
    const navigation = useNavigation();
    const isWatchOnly = useIsActivePortfolioWatchOnly();
    const isOnrampsEnabled = useFlag('enable_onramps');

    const handleQRScan = useScanQrScheme({
        onResult: useCallback(
            scheme => {
                switch (scheme.name) {
                    case 'btc-transfer':
                        navigation.navigate('SendAssetModal', {
                            screen: 'SendFormModal',
                            params: {
                                address: scheme.parsed.address,
                                amount: scheme.parsed.amount
                            }
                        });
                        break;
                }
            },
            [navigation]
        )
    });

    const handleNavigateToReceiveAsset = useCallback(() => {
        navigation.navigate('ReceiveAssetModal');
    }, [navigation]);

    const handleNavigateToSendAsset = useCallback(() => {
        void analytics.trackSendStart();
        navigation.navigate('SendAssetModal');
    }, [navigation, analytics]);

    const handleWatchOnlyAction = useCallback(() => {
        navigation.navigate('WatchOnlySheet');
    }, [navigation]);

    const handleNavigateToExchange = useCallback(() => {
        navigation.navigate('ExchangeModal');
    }, [navigation]);

    return (
        <Actions style={styles.container}>
            <Actions.Button
                testID={TEST_ID.home.sendButton}
                title={t('home.actions.send')}
                icon={ArrowTop28}
                onPress={isWatchOnly ? handleWatchOnlyAction : handleNavigateToSendAsset}
                opacity={isWatchOnly ? WATCH_ONLY_OPACITY : 1}
            />
            <Actions.Button
                testID={TEST_ID.home.receiveButton}
                title={t('home.actions.receive')}
                icon={ArrowDown28}
                onPress={handleNavigateToReceiveAsset}
            />
            {isOnrampsEnabled && (
                <Actions.Button
                    title={t('home.actions.buy')}
                    icon={Plus28}
                    onPress={isWatchOnly ? handleWatchOnlyAction : handleNavigateToExchange}
                    opacity={isWatchOnly ? WATCH_ONLY_OPACITY : 1}
                />
            )}
            <Actions.Button
                title={t('home.actions.scan')}
                icon={QrCodeScan28}
                onPress={isWatchOnly ? handleWatchOnlyAction : handleQRScan}
                opacity={isWatchOnly ? WATCH_ONLY_OPACITY : 1}
            />
        </Actions>
    );
};
