import { useFocusEffect, useNavigation } from '@react-navigation/core';
import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { DiscoveryError } from '@safely/ux';
import { useLedgerDeviceScan, useLedgerSession, useToast } from '@safely/ux';

import { Screen, Text } from '@mobile/shared/ui';

import { BluetoothPulse } from './components/BluetoothPulse';
import { styles } from './LedgerDiscoveryScreen.styles';

const errorMessageKeys = {
    timedOut: 'addWallet.connectLedger.discovery.notFound',
    locationDisabled: 'addWallet.connectLedger.discovery.locationDisabled'
} as const satisfies Record<DiscoveryError, string>;

export const LedgerDiscoveryScreen = () => {
    const toast = useToast();
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { devices, error } = useLedgerDeviceScan();
    const { setSelectedDevice, setFindMorePortfolioId } = useLedgerSession();
    const hasNavigated = useRef(false);

    const device = devices[0];

    useFocusEffect(
        useCallback(() => {
            hasNavigated.current = false;
        }, [])
    );

    useEffect(
        () => () => {
            setFindMorePortfolioId(null);
        },
        [setFindMorePortfolioId]
    );

    useEffect(() => {
        if (!device || hasNavigated.current) {
            return;
        }

        hasNavigated.current = true;
        setSelectedDevice(device);
        navigation.dispatch(CommonActions.navigate('LedgerPairingModal', { device: device.name }));
    }, [device, navigation, setSelectedDevice]);

    useEffect(() => {
        if (!error || hasNavigated.current) {
            return;
        }

        hasNavigated.current = true;
        toast(t(errorMessageKeys[error]));
        navigation.goBack();
    }, [error, toast, t, navigation]);

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
