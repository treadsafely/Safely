import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';

import { PortfolioType } from '@safely/core';
import { useActivePortfolio, useChangePortfolioMeta, useDateFormatter } from '@safely/ux';

import { PortfolioName } from '@mobile/entities/portfolio';
import { RemovePortfolioButton } from '@mobile/screens/SettingsScreen/components';
import { TEST_ID } from '@mobile/shared/constants';
import { Cell, List } from '@mobile/shared/ui';
import { Icon, Switch16 } from '@mobile/shared/ui/Icon';

import { styles } from './WalletSettings.styles';

export const StandardWalletSettings = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const portfolio = useActivePortfolio();
    const { mutateAsync: changePortfolioMeta } = useChangePortfolioMeta();
    const formatDate = useDateFormatter({
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const secretRevealedStatus =
        portfolio.type === PortfolioType.BIP39 ? portfolio.secretRevealedStatus : null;

    const handleEdit = () => {
        navigation.navigate('CustomizeWalletModal', {
            hasBackButton: true,
            defaultName: portfolio.meta.name,
            defaultIcon: portfolio.meta.icon,
            onSave: async meta => {
                await changePortfolioMeta({ portfolio, meta });
                navigation.getParent()?.goBack();
            },
            onClose: () => navigation.getParent()?.goBack()
        });
    };

    return (
        <List>
            <List.Group variant="separated" style={styles.selector}>
                <Cell onPress={() => navigation.navigate('SelectAccountModal')}>
                    <Cell.Content>
                        <Cell.Row>
                            <PortfolioName meta={portfolio.meta} type={portfolio.type} />
                        </Cell.Row>
                    </Cell.Content>
                    <Icon icon={Switch16} color="tertiary" />
                </Cell>
            </List.Group>
            <List.Group variant="separated">
                <Cell onPress={handleEdit}>
                    <Cell.Content>
                        <Cell.Row>
                            <Cell.Title>
                                {t('settings.groups.currentWallet.options.editWallet')}
                            </Cell.Title>
                        </Cell.Row>
                    </Cell.Content>
                    <Cell.Chevron />
                </Cell>
                {portfolio.type === PortfolioType.BIP39 && (
                    <Cell
                        testID={TEST_ID.walletSettings.recoveryPhrase}
                        onPress={() => navigation.navigate('RecoveryConfirmSheet')}
                    >
                        <Cell.Content>
                            <Cell.Row>
                                <Cell.Title>
                                    {t('security.groups.wallet.recovery.title')}
                                </Cell.Title>
                            </Cell.Row>
                            <Cell.Row>
                                <Cell.Subtitle numberOfLines={0}>
                                    {secretRevealedStatus
                                        ? t('security.groups.wallet.recovery.revealed', {
                                              date: formatDate.format(
                                                  secretRevealedStatus.revealedAt
                                              ),
                                              device: secretRevealedStatus.revealedFromDevice
                                          })
                                        : t('security.groups.wallet.recovery.subtitle')}
                                </Cell.Subtitle>
                            </Cell.Row>
                        </Cell.Content>
                        <Cell.Chevron />
                    </Cell>
                )}
            </List.Group>
            <List.Group variant="separated" style={styles.button}>
                <RemovePortfolioButton />
            </List.Group>
        </List>
    );
};
