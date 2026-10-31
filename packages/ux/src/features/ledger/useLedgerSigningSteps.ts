import { useSelector } from '@xstate/react';
import { useEffect } from 'react';

import { LedgerAppVersionUnknownError, LedgerDeviceBusyError, PortfolioType } from '@safely/core';

import type { LedgerSigningActor } from './LedgerSessionProvider';
import {
    LEDGER_FAILURE_STATES,
    SIGNING_APPROVE_STEP,
    SIGNING_CONNECT_STEP,
    SIGNING_OPEN_APP_STEP
} from './machine';
import type { LedgerStep } from '../../entities';
import {
    getLedgerModelName,
    resolveLedgerStepStatus,
    useActivePortfolio,
    useToast
} from '../../entities';
import { useTranslate } from '../../shared';

export const useLedgerSigningSteps = (actor: LedgerSigningActor) => {
    const t = useTranslate();
    const toast = useToast();

    const step = useSelector(actor, snapshot => snapshot.context.step);
    const error = useSelector(actor, snapshot => snapshot.context.error);
    const value = useSelector(actor, snapshot => snapshot.value);

    const portfolio = useActivePortfolio();
    const deviceModel = portfolio.type === PortfolioType.LEDGER ? portfolio.deviceModel : undefined;

    const isFailed = LEDGER_FAILURE_STATES.includes(value);
    const isUnsupportedApp = value === 'unsupportedApp';
    const isVersionUnknown = error instanceof LedgerAppVersionUnknownError;

    useEffect(() => {
        if (error instanceof LedgerDeviceBusyError) {
            toast(t('ledgerSign.deviceBusyToast'));
        }
    }, [error, toast, t]);

    const steps: LedgerStep[] = [
        {
            label: t('ledgerSign.steps.connect', { device: getLedgerModelName(deviceModel) }),
            status: resolveLedgerStepStatus(SIGNING_CONNECT_STEP, step, isFailed)
        },
        {
            label: isVersionUnknown
                ? t('ledgerSign.steps.openAppVersionUnknown')
                : t('ledgerSign.steps.openApp'),
            status: resolveLedgerStepStatus(SIGNING_OPEN_APP_STEP, step, isFailed)
        },
        {
            label: t('ledgerSign.steps.approve'),
            status: resolveLedgerStepStatus(SIGNING_APPROVE_STEP, step, isFailed)
        }
    ];

    return { steps, deviceModel, isFailed, isUnsupportedApp };
};
