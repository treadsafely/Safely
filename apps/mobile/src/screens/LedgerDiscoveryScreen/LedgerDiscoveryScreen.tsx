import type { DiscoveredDevice } from '@ledgerhq/device-management-kit';
import { useFocusEffect, useNavigation } from '@react-navigation/core';
import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLedgerDiscovery, useLedgerSession } from '@safely/ux';

import { Screen, Text } from '@mobile/shared/ui';

import { BluetoothPulse } from './components/BluetoothPulse';
import { styles } from './LedgerDiscoveryScreen.styles';

export const LedgerDiscoveryScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { setFindMorePortfolioId } = useLedgerSession();

    const { reset } = useLedgerDiscovery({
        onDeviceFound: useCallback(
            (device: DiscoveredDevice) =>
                navigation.dispatch(
                    CommonActions.navigate('LedgerPairingModal', { device: device.name })
                ),
            [navigation]
        ),
        onError: useCallback(() => navigation.goBack(), [navigation])
    });

    useFocusEffect(reset);

    useEffect(
        () => () => {
            setFindMorePortfolioId(null);
        },
        [setFindMorePortfolioId]
    );

    return (
        <Screen>
            <Screen.Header variant="left">
                <Screen.Header.BackButton />
            </Screen.Header>
            <Screen.Content style={styles.content}>
                <View style={styles.header}>
                    <BluetoothPulse />
                    <View style={styles.textContainer}>
                        <Text textAlign="center" variant="titleM">
                            {t('addWallet.connectLedger.discovery.title')}
                        </Text>
                        <Text textAlign="center" variant="bodyL" color="secondary">
                            {t('addWallet.connectLedger.discovery.subtitle')}
                        </Text>
                    </View>
                </View>
            </Screen.Content>
        </Screen>
    );
};
