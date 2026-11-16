import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLedgerSigning, useLedgerSigningSteps, type LedgerSigningActor } from '@safely/ux';

import { getLedgerImage, LedgerSteps } from '@mobile/features/ledger';
import { BottomSheetScreen } from '@mobile/shared/navigation';
import { resources } from '@mobile/shared/resources';
import { Button, Image, Text, useBottomSheet } from '@mobile/shared/ui';

import { styles } from './ConnectToSignSheet.styles';

interface Props {
    actor: LedgerSigningActor;
}

const ConnectToSignContent = ({ actor }: Props) => {
    const { t } = useTranslation();
    const { close } = useBottomSheet();
    const { steps, deviceModel, isFailed, isUnsupportedApp } = useLedgerSigningSteps(actor);

    const { activeActor } = useLedgerSigning();

    useEffect(() => {
        if (activeActor !== actor) {
            close();
        }
    }, [activeActor, actor, close]);

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
    // for closing animation purpose
    const [actor] = useState(activeActor);

    const handleClose = () => {
        if (actor && actor.getSnapshot().status !== 'done') {
            actor.send({ type: 'CANCEL' });
        }
    };

    return (
        <BottomSheetScreen onClose={handleClose}>
            {actor ? <ConnectToSignContent actor={actor} /> : <View />}
        </BottomSheetScreen>
    );
};
