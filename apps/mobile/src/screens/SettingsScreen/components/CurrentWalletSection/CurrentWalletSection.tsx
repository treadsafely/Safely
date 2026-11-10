import { useNavigation } from '@react-navigation/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PortfolioType } from '@safely/core';
import { useActivePortfolio } from '@safely/ux';

import { PortfolioName } from '@mobile/entities/portfolio';
import { TEST_ID } from '@mobile/shared/constants';
import { Button, Cell, List } from '@mobile/shared/ui';

import { styles } from './CurrentWalletSection.styles';

export const CurrentWalletSection = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const activePortfolio = useActivePortfolio();

    const isLedger = activePortfolio.type === PortfolioType.LEDGER;

    return (
        <List>
            <List.Title>
                {isLedger
                    ? t('settings.groups.currentWallet.ledgerTitle')
                    : t('settings.groups.currentWallet.title')}
            </List.Title>
            <List.Group variant="divided">
                <Cell
                    testID={TEST_ID.settings.currentWallet}
                    onPress={() =>
                        navigation.navigate('SettingsModal', { screen: 'WalletSettingsModal' })
                    }
                >
                    <Cell.Content>
                        <Cell.Row>
                            <PortfolioName
                                meta={activePortfolio.meta}
                                fontVariant="labelL"
                                gap={12}
                                size={16}
                                type={activePortfolio.type}
                            />
                        </Cell.Row>
                    </Cell.Content>
                    <Cell.Chevron />
                </Cell>
            </List.Group>
            <View style={styles.buttonContainer}>
                <Button
                    type="secondary"
                    size="small"
                    onPress={() => navigation.navigate('AddWalletModal')}
                >
                    {t('addWallet.title')}
                </Button>
            </View>
        </List>
    );
};
