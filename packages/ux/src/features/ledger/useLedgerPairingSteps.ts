import { useEffect, useRef } from 'react';

import { LedgerAppNotInstalledError, LedgerDeviceBusyError } from '@safely/core';

import { useLedgerSession } from './LedgerSessionProvider';
import { PAIRING_CONNECT_STEP, PAIRING_OPEN_APP_STEP } from './machine/ledger-pairing-machine';
import { useLedgerPairing } from './useLedgerPairing';
import type { LedgerStep } from '../../entities';
import { getLedgerModelLabel, resolveLedgerStepStatus, useToast } from '../../entities';
import { useTranslate } from '../../shared';

const SUCCESS_DELAY_MS = 1_000;

const PAIRING_CONNECTED_STEP = PAIRING_OPEN_APP_STEP + 1;

export const useLedgerPairingSteps = (params: {
    onConnected: () => void;
    onFailed: (isAppNotInstalled: boolean) => void;
}) => {
    const { onConnected, onFailed } = params;

    const t = useTranslate();
    const toast = useToast();
    const { selectedDevice } = useLedgerSession();
    const { status, failedStep, error } = useLedgerPairing();
    const hasFinished = useRef(false);

    useEffect(() => {
        if (hasFinished.current) {
            return;
        }

        if (status === 'connected') {
            const timer = setTimeout(() => {
                hasFinished.current = true;
                onConnected();
            }, SUCCESS_DELAY_MS);

            return () => clearTimeout(timer);
        }

        if (status !== 'error') {
            return;
        }

        hasFinished.current = true;

        if (error instanceof LedgerDeviceBusyError) {
            toast(t('ledgerSign.deviceBusyToast'));
        }

        onFailed(error instanceof LedgerAppNotInstalledError);
    }, [status, error, onConnected, onFailed, toast, t]);

    const isFailed = status === 'error';
    const currentStep = isFailed
        ? failedStep
        : status === 'connecting'
          ? PAIRING_CONNECT_STEP
          : status === 'openingApp'
            ? PAIRING_OPEN_APP_STEP
            : PAIRING_CONNECTED_STEP;

    const steps: LedgerStep[] = [
        {
            label: t('addWallet.connectLedger.pairing.steps.connect'),
            status: resolveLedgerStepStatus(PAIRING_CONNECT_STEP, currentStep, isFailed)
        },
        {
            label: t('addWallet.connectLedger.pairing.steps.openApp'),
            status: resolveLedgerStepStatus(PAIRING_OPEN_APP_STEP, currentStep, isFailed)
        }
    ];

    const title = t('addWallet.connectLedger.pairing.title', {
        device: getLedgerModelLabel(selectedDevice?.deviceModel.model)
    }).trim();

    return { steps, title };
};
