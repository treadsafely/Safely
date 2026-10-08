import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PortfolioType } from '@safely/core';
import { useActivePortfolio, useRecordActivePortfolioSecretReveal } from '@safely/ux';

import { BottomSheetScreen } from '@mobile/shared/navigation';
import { Button, Text, useBottomSheet, useCloseOnReturn } from '@mobile/shared/ui';
import { Icon, ListKey96 } from '@mobile/shared/ui/Icon';

import { styles } from './RecoveryConfirmSheet.styles';

const RecoveryConfirmContent = () => {
    const { t } = useTranslation();
    const { close } = useBottomSheet();
    const portfolio = useActivePortfolio();

    if (portfolio.type !== PortfolioType.BIP39) {
        throw new Error('Recovery only available for BIP39 portfolio');
    }

    const navigation = useNavigation();
    const markNavigated = useCloseOnReturn();

    const { mutate: recordSeedReveal } = useRecordActivePortfolioSecretReveal();

    const handleReveal = async () => {
        try {
            const mnemonic = await portfolio.getMnemonic();
            recordSeedReveal();
            markNavigated();
            navigation.navigate('RecoveryPhraseModal', { mnemonic });
        } catch {
            // Security check failed
        }
    };

    return (
        <View style={styles.content}>
            <Icon icon={ListKey96} />

            <View style={styles.titleBox}>
                <Text textAlign="center" variant="titleM">
                    {t('security.recoverySheet.title')}
                </Text>
                <Text textAlign="center" variant="bodyL" color="secondary">
                    {t('security.recoverySheet.description')}
                </Text>
            </View>

            <View style={styles.warningBox}>
                <View style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text variant="bodyM" color="primary" style={styles.bulletText}>
                        {t('security.recoverySheet.warning1')}
                    </Text>
                </View>
                <View style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text variant="bodyM" color="primary" style={styles.bulletText}>
                        {t('security.recoverySheet.warning2')}
                    </Text>
                </View>
            </View>

            <View style={styles.buttons}>
                <Button type="secondary" size="large" style={styles.button} onPress={close}>
                    {t('security.recoverySheet.cancel')}
                </Button>
                <Button
                    type="primary"
                    size="large"
                    style={[styles.button, styles.buttonPrimary]}
                    onPress={handleReveal}
                >
                    {t('security.recoverySheet.reveal')}
                </Button>
            </View>
        </View>
    );
};

export const RecoveryConfirmSheet = () => {
    return (
        <BottomSheetScreen shortHeader>
            <RecoveryConfirmContent />
        </BottomSheetScreen>
    );
};
