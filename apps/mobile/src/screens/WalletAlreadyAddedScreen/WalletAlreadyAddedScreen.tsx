import { useNavigation } from '@react-navigation/core';
import type { StaticScreenProps } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Portfolio, PortfolioMeta } from '@safely/core';
import { getPortfolioDisplayName, useChangePortfolioMeta, useSetActivePortfolio } from '@safely/ux';

import { Button, Screen, Text } from '@mobile/shared/ui';

import { styles } from './WalletAlreadyAddedScreen.styles';

type WalletAlreadyAddedScreenProps = StaticScreenProps<{
    portfolio: Portfolio;
}>;

export const WalletAlreadyAddedScreen = (props: WalletAlreadyAddedScreenProps) => {
    const { portfolio } = props.route.params;
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { mutateAsync: setActivePortfolio } = useSetActivePortfolio();

    const walletDisplayName = getPortfolioDisplayName(portfolio.meta);
    const { mutateAsync: changePortfolioMeta } = useChangePortfolioMeta();

    const handleOpen = useCallback(async () => {
        await setActivePortfolio(portfolio);
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'TabsNavigator' }]
            })
        );
    }, [navigation, setActivePortfolio, portfolio]);

    const handleEdit = useCallback(() => {
        const onClose = async () => {
            await setActivePortfolio(portfolio);
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'TabsNavigator' }]
                })
            );
        };

        navigation.navigate('CustomizeWalletModal', {
            defaultIcon: portfolio.meta.icon,
            defaultName: portfolio.meta.name,
            onClose,
            onSave: async (meta: PortfolioMeta) => {
                await changePortfolioMeta({ portfolio, meta });
                return onClose();
            }
        });
    }, [navigation, portfolio, setActivePortfolio, changePortfolioMeta]);

    return (
        <Screen>
            <Screen.Header variant="left">
                <Screen.Header.BackButton />
            </Screen.Header>
            <Screen>
                <View style={styles.container}>
                    <View style={styles.centerBlock}>
                        <Text variant="titleM" textAlign="center">
                            {t('walletAlreadyAdded.title', { name: walletDisplayName })}
                        </Text>
                        <Text variant="bodyL" color="secondary" textAlign="center">
                            {t('walletAlreadyAdded.subtitle')}
                        </Text>
                    </View>

                    <View style={styles.buttons}>
                        <Button type="primary" size="large" onPress={handleOpen}>
                            {t('walletAlreadyAdded.open')}
                        </Button>
                        <Button type="secondary" size="large" onPress={handleEdit}>
                            {t('walletAlreadyAdded.edit')}
                        </Button>
                    </View>
                </View>
            </Screen>
        </Screen>
    );
};
