import { useNavigation } from '@react-navigation/core';
import { useCallback, useMemo } from 'react';

import { BtcXpub } from '@safely/core';
import { isDerivableEntities, useActivePortfolioEntities } from '@safely/ux';

import { PortfolioName } from '@mobile/entities/portfolio';
import { Button, Cell, List, Screen, Text } from '@mobile/shared/ui';
import { Icon, Switch16 } from '@mobile/shared/ui/Icon';
import { useCopy } from '@mobile/shared/utils/copy';

import { styles } from './DevToolsXpubScreen.styles';

export const DevToolsXpubScreen = () => {
    const copy = useCopy();
    const entities = useActivePortfolioEntities();
    const navigation = useNavigation();

    const xpub = useMemo(() => {
        if (isDerivableEntities(entities)) {
            return BtcXpub.toZpub(entities.btcWallet.xpub);
        }

        return entities.type === 'watch-only' ? entities.portfolio.wallet.xpub : undefined;
    }, [entities]);

    const handleSelectWallet = useCallback(() => {
        navigation.navigate('SelectAccountModal');
    }, [navigation]);

    const handleCopyXpub = useCallback(() => {
        if (!xpub) return;

        copy(xpub);
    }, [copy, xpub]);

    const portfolio = entities.portfolio;

    return (
        <Screen>
            <Screen.Header variant="center">
                <Screen.Header.BackButton />
                <Screen.Header.Title>
                    <Text variant="titleS">Xpub</Text>
                </Screen.Header.Title>
            </Screen.Header>

            <Screen.Content style={styles.content}>
                <List>
                    <List.Title>Wallet</List.Title>
                    <List.Group variant="divided">
                        <Cell onPress={handleSelectWallet}>
                            <Cell.Content>
                                <Cell.Row>
                                    <PortfolioName meta={portfolio.meta} type={portfolio.type} />
                                </Cell.Row>
                            </Cell.Content>
                            <Icon icon={Switch16} color="tertiary" />
                        </Cell>
                        <Cell>
                            <Cell.Content>
                                <Cell.Row>
                                    <Text
                                        variant="bodyM"
                                        color={xpub ? 'accentGreen' : 'accentRed'}
                                    >
                                        {xpub
                                            ? 'Xpub is available for this derivation.'
                                            : 'Not available (watch-only imported by address).'}
                                    </Text>
                                </Cell.Row>
                            </Cell.Content>
                        </Cell>
                    </List.Group>
                </List>

                <Button
                    type="primary"
                    size="large"
                    style={styles.copyButton}
                    disabled={!xpub}
                    onPress={handleCopyXpub}
                >
                    Copy xpub
                </Button>
            </Screen.Content>
        </Screen>
    );
};
