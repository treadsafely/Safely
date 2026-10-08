import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BottomSheetScreen } from '@mobile/shared/navigation';
import { Button, Text, useCallOnClose } from '@mobile/shared/ui';

import { styles } from './MoreOptionsSheet.styles';

const MoreOptionsContent = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const callOnClose = useCallOnClose();

    const handleConnectLedger = () => {
        callOnClose(() => navigation.navigate('OnboardingConnectLedgerModal'));
    };

    const handleWatchAccount = () => {
        callOnClose(() => navigation.navigate('OnboardingWatchAccountScreen'));
    };

    return (
        <View>
            <View style={styles.titleBox}>
                <Text textAlign="center" variant="titleM">
                    {t('moreOptions.title')}
                </Text>
                <Text textAlign="center" variant="bodyL" color="secondary">
                    {t('moreOptions.subtitle')}
                </Text>
            </View>
            <View style={styles.footer}>
                <Button type="secondary" size="large" onPress={handleConnectLedger}>
                    {t('moreOptions.connectLedger')}
                </Button>
                <Button type="secondary" size="large" onPress={handleWatchAccount}>
                    {t('moreOptions.watchAccount')}
                </Button>
            </View>
        </View>
    );
};

export const MoreOptionsSheet = () => {
    return (
        <BottomSheetScreen shortHeader>
            <MoreOptionsContent />
        </BottomSheetScreen>
    );
};
