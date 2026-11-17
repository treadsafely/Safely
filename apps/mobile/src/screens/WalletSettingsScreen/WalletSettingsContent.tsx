import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PortfolioType } from '@safely/core';
import { useActivePortfolio } from '@safely/ux';

import { TEST_ID } from '@mobile/shared/constants';
import { Screen } from '@mobile/shared/ui';
import { ArrowLeft16, Icon } from '@mobile/shared/ui/Icon';

import { LedgerWalletSettings, StandardWalletSettings } from './components';
import { styles } from './WalletSettingsScreen.styles';

export const WalletSettingsContent = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const portfolio = useActivePortfolio();

    return (
        <Screen>
            <Screen.Header variant="center">
                <Screen.Header.Button
                    testID={TEST_ID.walletSettings.backButton}
                    onPress={navigation.goBack}
                >
                    <Icon icon={ArrowLeft16} />
                </Screen.Header.Button>
                <Screen.Header.Title>{t('settings.title')}</Screen.Header.Title>
                <View style={styles.headerPlaceholder} />
            </Screen.Header>
            <Screen.Scrollable contentContainerStyle={styles.content}>
                {portfolio.type === PortfolioType.LEDGER ? (
                    <LedgerWalletSettings />
                ) : (
                    <StandardWalletSettings />
                )}
            </Screen.Scrollable>
        </Screen>
    );
};
