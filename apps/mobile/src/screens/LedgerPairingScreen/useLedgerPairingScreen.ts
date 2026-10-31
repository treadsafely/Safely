import { useNavigation } from '@react-navigation/core';
import { StackActions } from '@react-navigation/native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageSourcePropType } from 'react-native';

import type { LedgerStep } from '@safely/ux';
import { useLedgerPairingSteps, useLedgerSession } from '@safely/ux';

import { getLedgerImage } from '@mobile/features/ledger';

type LedgerPairingScreenState = {
    image: ImageSourcePropType;
    title: string;
    subtitle: string;
    steps: LedgerStep[];
};

export const useLedgerPairingScreen = (): LedgerPairingScreenState => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { selectedDevice } = useLedgerSession();

    const { steps, title } = useLedgerPairingSteps({
        onConnected: useCallback(
            () => navigation.dispatch(StackActions.replace('LedgerPairingSuccessModal')),
            [navigation]
        ),
        onFailed: useCallback(
            (isAppNotInstalled: boolean) =>
                navigation.dispatch(
                    StackActions.replace('LedgerPairingUnsuccessModal', { isAppNotInstalled })
                ),
            [navigation]
        )
    });

    return {
        image: getLedgerImage(selectedDevice?.deviceModel.model),
        title,
        subtitle: t('addWallet.connectLedger.pairing.subtitle'),
        steps
    };
};
