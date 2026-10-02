import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PortfolioNetworkType } from '@safely/core';
import {
    useNotificationSettings,
    usePortfolios,
    useSetAllWalletsNotifications,
    useSetPortfolioNotificationsSelected
} from '@safely/ux';

import { PortfolioName } from '@mobile/entities/portfolio';
import { Cell, List, Screen, Switch } from '@mobile/shared/ui';
import { ArrowLeft16, Checkmark28, Icon } from '@mobile/shared/ui/Icon';

import { styles } from './NotificationsWalletsScreen.styles';

export const NotificationsWalletsScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const settings = useNotificationSettings();
    const portfolios = usePortfolios().filter(
        portfolio => portfolio.networkType === PortfolioNetworkType.MAINNET
    );
    const { mutate: setAllWallets } = useSetAllWalletsNotifications();
    const { mutate: setPortfolioSelected } = useSetPortfolioNotificationsSelected();

    const handleAllWalletsToggle = () =>
        setAllWallets({
            isEnabled: !settings.allWallets,
            selectedPortfolioIds: portfolios.map(portfolio => portfolio.id.toString())
        });

    return (
        <Screen>
            <Screen.Header variant="center">
                <Screen.Header.Button onPress={navigation.goBack}>
                    <Icon icon={ArrowLeft16} />
                </Screen.Header.Button>
                <Screen.Header.Title>{t('notifications.wallets.title')}</Screen.Header.Title>
                <View style={styles.headerPlaceholder} />
            </Screen.Header>
            <Screen.Scrollable contentContainerStyle={styles.listContent}>
                <View style={styles.container}>
                    <List.Group variant="divided">
                        <Cell>
                            <Cell.Content>
                                <Cell.Row>
                                    <Cell.Title>
                                        {t('notifications.account.allWallets.title')}
                                    </Cell.Title>
                                </Cell.Row>
                                <Cell.Row>
                                    <Cell.Subtitle numberOfLines={0}>
                                        {t('notifications.account.allWallets.subtitle')}
                                    </Cell.Subtitle>
                                </Cell.Row>
                            </Cell.Content>
                            <Switch value={settings.allWallets} onPress={handleAllWalletsToggle} />
                        </Cell>
                    </List.Group>
                    <List.Group variant="divided" style={styles.walletsGroup}>
                        {portfolios.map(portfolio => {
                            const isSelected = settings.isPortfolioSelected(portfolio);

                            return (
                                <Cell
                                    key={portfolio.id.toString()}
                                    onPress={() =>
                                        setPortfolioSelected({
                                            portfolioId: portfolio.id.toString(),
                                            isSelected: !isSelected
                                        })
                                    }
                                >
                                    <Cell.Content>
                                        <Cell.Row>
                                            <PortfolioName
                                                meta={portfolio.meta}
                                                type={portfolio.type}
                                                fontVariant="labelL"
                                                gap={12}
                                                size={16}
                                            />
                                        </Cell.Row>
                                    </Cell.Content>
                                    <View style={styles.checkmarkSlot}>
                                        {isSelected && <Icon icon={Checkmark28} color="accent" />}
                                    </View>
                                </Cell>
                            );
                        })}
                    </List.Group>
                </View>
            </Screen.Scrollable>
        </Screen>
    );
};
