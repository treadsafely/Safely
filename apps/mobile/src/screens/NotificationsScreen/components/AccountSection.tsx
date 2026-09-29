import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';

import { PortfolioNetworkType } from '@safely/core';
import {
    useActiveAccountMeta,
    useActivePortfolioEntitiesIdsQuery,
    useNotificationSettings,
    usePortfolios,
    useSetAllWalletsNotifications,
    useSetNotificationsEnabled
} from '@safely/ux';

import { Cell, List, Switch } from '@mobile/shared/ui';

const MAX_LISTED_WALLET_NAMES = 3;

function useSelectedWalletsSummary(): string {
    const { t } = useTranslation();
    const portfolios = usePortfolios();
    const settings = useNotificationSettings();

    const names = settings
        .selectPortfolios(portfolios)
        .filter(portfolio => portfolio.networkType === PortfolioNetworkType.MAINNET)
        .map(portfolio => portfolio.meta.name);
    const listed = names.slice(0, MAX_LISTED_WALLET_NAMES).join(', ');
    const rest = names.length - MAX_LISTED_WALLET_NAMES;

    return rest > 0
        ? t('notifications.account.selectedWallets.more', { names: listed, count: rest })
        : listed;
}

function useTransactionsSummary(): string {
    const { t } = useTranslation();
    const settings = useNotificationSettings();
    const keys = settings.enabledEventKeys;

    if (keys.length === 0) {
        return t('notifications.account.transactions.none');
    }

    return keys.map(key => t(`notifications.transactions.events.${key}.summary`)).join(', ');
}

export const AccountSection = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const accountName = useActiveAccountMeta().name;
    const settings = useNotificationSettings();
    const portfolios = usePortfolios();
    const { data: activePortfolio } = useActivePortfolioEntitiesIdsQuery();
    const { mutate: setEnabled } = useSetNotificationsEnabled();
    const { mutate: setAllWallets } = useSetAllWalletsNotifications();
    const selectedWalletsSummary = useSelectedWalletsSummary();
    const transactionsSummary = useTransactionsSummary();

    const handleAllWalletsToggle = () => {
        const selectedPortfolioIds = activePortfolio
            ? [activePortfolio.portfolioId]
            : portfolios.map(portfolio => portfolio.id.toString());

        setAllWallets({ isEnabled: !settings.allWallets, selectedPortfolioIds });
    };

    return (
        <List>
            <List.Title>{t('notifications.account.title', { name: accountName })}</List.Title>
            <List.Group variant="divided">
                <Cell>
                    <Cell.Content>
                        <Cell.Row>
                            <Cell.Title>{t('notifications.account.enabled.title')}</Cell.Title>
                        </Cell.Row>
                        <Cell.Row>
                            <Cell.Subtitle numberOfLines={0}>
                                {t('notifications.account.enabled.subtitle')}
                            </Cell.Subtitle>
                        </Cell.Row>
                    </Cell.Content>
                    <Switch
                        value={settings.enabled}
                        onPress={() => setEnabled(!settings.enabled)}
                    />
                </Cell>
                {settings.enabled && (
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
                )}
                {settings.enabled && !settings.allWallets && (
                    <Cell
                        onPress={() =>
                            navigation.navigate('SettingsModal', {
                                screen: 'NotificationsWalletsModal'
                            })
                        }
                    >
                        <Cell.Content>
                            <Cell.Row>
                                <Cell.Title>
                                    {t('notifications.account.selectedWallets.title')}
                                </Cell.Title>
                            </Cell.Row>
                            {selectedWalletsSummary.length > 0 && (
                                <Cell.Row>
                                    <Cell.Subtitle numberOfLines={0}>
                                        {selectedWalletsSummary}
                                    </Cell.Subtitle>
                                </Cell.Row>
                            )}
                        </Cell.Content>
                        <Cell.Chevron />
                    </Cell>
                )}
                {settings.enabled && (
                    <Cell
                        onPress={() =>
                            navigation.navigate('SettingsModal', {
                                screen: 'NotificationsTransactionsModal'
                            })
                        }
                    >
                        <Cell.Content>
                            <Cell.Row>
                                <Cell.Title>
                                    {t('notifications.account.transactions.title')}
                                </Cell.Title>
                            </Cell.Row>
                            <Cell.Row>
                                <Cell.Subtitle numberOfLines={0}>
                                    {transactionsSummary}
                                </Cell.Subtitle>
                            </Cell.Row>
                        </Cell.Content>
                        <Cell.Chevron />
                    </Cell>
                )}
            </List.Group>
        </List>
    );
};
