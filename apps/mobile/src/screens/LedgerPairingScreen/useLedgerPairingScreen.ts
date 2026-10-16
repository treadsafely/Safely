import { DeviceModelId } from '@ledgerhq/device-management-kit';
import { useNavigation } from '@react-navigation/core';
import { StackActions } from '@react-navigation/native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageSourcePropType } from 'react-native';

import { LedgerAppNotInstalledError, LedgerDeviceBusyError } from '@safely/core';
import { useLedgerPairing, useLedgerSession, useToast } from '@safely/ux';

import type { LedgerStep, LedgerStepStatus } from '@mobile/features/ledger';
import { getLedgerImage } from '@mobile/features/ledger';

const SUCCESS_DELAY_MS = 1_000;

const MODEL_LABEL: Partial<Record<DeviceModelId, string>> = {
    [DeviceModelId.STAX]: 'Stax',
    [DeviceModelId.FLEX]: 'Flex',
    [DeviceModelId.NANO_X]: 'Nano X',
    [DeviceModelId.NANO_S]: 'Nano S'
};

type LedgerPairingScreenState = {
    image: ImageSourcePropType;
    title: string;
    subtitle: string;
    steps: LedgerStep[];
};

export const useLedgerPairingScreen = (): LedgerPairingScreenState => {
    const toast = useToast();
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { selectedDevice } = useLedgerSession();
    const { status, failedStep, error } = useLedgerPairing();

    const modelLabel = selectedDevice ? (MODEL_LABEL[selectedDevice.deviceModel.model] ?? '') : '';

    const isDeviceBusy = error instanceof LedgerDeviceBusyError;
    const isAppNotInstalled = error instanceof LedgerAppNotInstalledError;

    useEffect(() => {
        if (status === 'connected') {
            const timer = setTimeout(
                () => navigation.dispatch(StackActions.replace('LedgerPairingSuccessModal')),
                SUCCESS_DELAY_MS
            );

            return () => clearTimeout(timer);
        }

        if (status !== 'error') {
            return;
        }

        if (isDeviceBusy) {
            toast(t('ledgerSign.deviceBusyToast'));
        }

        navigation.dispatch(
            StackActions.replace('LedgerPairingUnsuccessModal', { isAppNotInstalled })
        );
    }, [status, navigation, isDeviceBusy, isAppNotInstalled, toast, t]);

    const currentStep = status === 'connecting' ? 0 : status === 'openingApp' ? 1 : 2;

    const stepStatus = (index: number): LedgerStepStatus => {
        if (status === 'error') {
            if (index < failedStep) {
                return 'done';
            }

            return index === failedStep ? 'error' : 'pending';
        }

        if (index < currentStep) {
            return 'done';
        }

        return index === currentStep ? 'active' : 'pending';
    };

    return {
        image: getLedgerImage(selectedDevice?.deviceModel.model),
        title: t('addWallet.connectLedger.pairing.title', { device: modelLabel }).trim(),
        subtitle: t('addWallet.connectLedger.pairing.subtitle'),
        steps: [
            { label: t('addWallet.connectLedger.pairing.steps.connect'), status: stepStatus(0) },
            { label: t('addWallet.connectLedger.pairing.steps.openApp'), status: stepStatus(1) }
        ]
    };
};
