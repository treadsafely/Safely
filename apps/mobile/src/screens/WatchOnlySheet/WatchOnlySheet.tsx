import { useNavigation } from '@react-navigation/core';
import { CommonActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PortfolioNetworkType } from '@safely/core';

import { BottomSheetScreen } from '@mobile/shared/navigation';
import { Button, Text, useBottomSheet, useCloseOnReturn } from '@mobile/shared/ui';

import { styles } from './WatchOnlySheet.styles';

const WatchOnlyContent = () => {
    const { t } = useTranslation();
    const { close } = useBottomSheet();
    const navigation = useNavigation();
    const markNavigated = useCloseOnReturn();

    const handleImport = () => {
        markNavigated();
        navigation.dispatch(
            CommonActions.navigate('AddWalletModal', {
                screen: 'ImportWalletModal',
                params: {
                    networkType: PortfolioNetworkType.MAINNET
                }
            })
        );
    };

    return (
        <View style={styles.content}>
            <View style={styles.titleBox}>
                <Text textAlign="center" variant="titleL">
                    {t('watchOnlySheet.title')}
                </Text>
                <Text textAlign="center" variant="bodyL" color="secondary">
                    {t('watchOnlySheet.subtitle')}
                </Text>
            </View>

            <View style={styles.buttons}>
                <Button type="primary" size="large" onPress={handleImport}>
                    {t('watchOnlySheet.import')}
                </Button>
                <Button type="secondary" size="large" onPress={close}>
                    {t('watchOnlySheet.ok')}
                </Button>
            </View>
        </View>
    );
};

export const WatchOnlySheet = () => {
    return (
        <BottomSheetScreen>
            <WatchOnlyContent />
        </BottomSheetScreen>
    );
};
