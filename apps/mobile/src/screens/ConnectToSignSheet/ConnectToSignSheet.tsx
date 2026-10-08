import { useSelector } from '@xstate/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { LedgerAppVersionUnknownError, LedgerDeviceBusyError, PortfolioType } from '@safely/core';
import {
    LEDGER_FAILURE_STATES,
    useActivePortfolio,
    useLedgerSigning,
    useToast,
    type LedgerSigningActor
} from '@safely/ux';

import type { LedgerStepStatus } from '@mobile/features/ledger';
import { getLedgerImage, getLedgerModelName, LedgerSteps } from '@mobile/features/ledger';
import { BottomSheetScreen } from '@mobile/shared/navigation';
import { resources } from '@mobile/shared/resources';
import { Button, Image, Text, useBottomSheet } from '@mobile/shared/ui';

import { styles } from './ConnectToSignSheet.styles';

interface Props {
    actor: LedgerSigningActor;
}

const ConnectToSignContent = ({ actor }: Props) => {
    const toast = useToast();
    const { t } = useTranslation();
    const { close } = useBottomSheet();

    const value = useSelector(actor, snapshot => snapshot.value);
    const step = useSelector(actor, snapshot => snapshot.context.step);
    const error = useSelector(actor, snapshot => snapshot.context.error);
    const isDone = useSelector(actor, snapshot => snapshot.status === 'done');

    const portfolio = useActivePortfolio();
    const deviceModel = portfolio.type === PortfolioType.LEDGER ? portfolio.deviceModel : undefined;

    const isFailed = LEDGER_FAILURE_STATES.includes(value);
    const isUnsupportedApp = value === 'unsupportedApp';
    const isVersionUnknown = error instanceof LedgerAppVersionUnknownError;

    useEffect(() => {
        if (isDone) {
            close();
        }
    }, [isDone, close]);

    useEffect(() => {
        if (error instanceof LedgerDeviceBusyError) {
            toast(t('ledgerSign.deviceBusyToast'));
        }
    }, [error, toast, t]);

    const stepStatus = (index: number): LedgerStepStatus => {
        if (index < step) {
            return 'done';
        }

        if (index === step) {
            return isFailed ? 'error' : 'active';
        }

        return 'pending';
    };

    const steps = [
        {
            label: t('ledgerSign.steps.connect', {
                device: getLedgerModelName(deviceModel)
            }),
            status: stepStatus(0)
        },
        {
            label: isVersionUnknown
                ? t('ledgerSign.steps.openAppVersionUnknown')
                : t('ledgerSign.steps.openApp'),
            status: stepStatus(1)
        },
        { label: t('ledgerSign.steps.approve'), status: stepStatus(2) }
    ];

    if (isUnsupportedApp) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Image source={resources.btcAppLogo} style={styles.updateIcon} />
                    <View style={styles.textContainer}>
                        <Text variant="titleM" textAlign="center">
                            {t('ledgerSign.updateApp.title')}
                        </Text>
                        <Text variant="bodyL" color="secondary" textAlign="center">
                            {t('ledgerSign.updateApp.subtitle')}
                        </Text>
                    </View>
                </View>

                <View style={styles.buttons}>
                    <View style={styles.buttonItem}>
                        <Button type="primary" size="large" onPress={close}>
                            {t('ledgerSign.updateApp.gotIt')}
                        </Button>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image source={getLedgerImage(deviceModel)} style={styles.image} />
                <View style={styles.textContainer}>
                    <Text variant="titleM" textAlign="center">
                        {t('ledgerSign.title')}
                    </Text>
                    <Text variant="bodyL" color="secondary" textAlign="center">
                        {t('ledgerSign.subtitle')}
                    </Text>
                </View>
            </View>

            <LedgerSteps steps={steps} />

            <View style={styles.buttons}>
                <View style={styles.buttonItem}>
                    <Button
                        type="secondary"
                        size="large"
                        onPress={() => actor.send({ type: 'CANCEL' })}
                    >
                        {t('ledgerSign.cancel')}
                    </Button>
                </View>
                {isFailed && (
                    <View style={styles.buttonItem}>
                        <Button
                            type="primary"
                            size="large"
                            onPress={() => actor.send({ type: 'RETRY' })}
                        >
                            {t('ledgerSign.retry')}
                        </Button>
                    </View>
                )}
            </View>
        </View>
    );
};

export const ConnectToSignSheet = () => {
    const { activeActor } = useLedgerSigning();

    const handleClose = () => {
        if (activeActor && activeActor.getSnapshot().status !== 'done') {
            activeActor.send({ type: 'CANCEL' });
        }
    };

    return (
        <BottomSheetScreen onClose={handleClose}>
            {activeActor ? <ConnectToSignContent actor={activeActor} /> : <View />}
        </BottomSheetScreen>
    );
};
