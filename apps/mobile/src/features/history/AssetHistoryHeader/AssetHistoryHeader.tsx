import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, GradientBackground, Screen, Text } from '@mobile/shared/ui';

import { styles } from './AssetHistoryHeader.styles';

const GRADIENT_HEIGHT = 390;

type AssetHistoryHeaderProps = {
    gradientColor: string;
    symbol: string;
    isTestnet: boolean;
    address: string | undefined;
    amount: string | undefined;
    fiatAmount: string | undefined;
    actions: ReactNode;
};

export const AssetHistoryHeader = (props: AssetHistoryHeaderProps) => {
    const { gradientColor, symbol, isTestnet, address, amount, fiatAmount, actions } = props;
    const { t } = useTranslation();

    return (
        <>
            <GradientBackground color={gradientColor} position="top" height={GRADIENT_HEIGHT} />
            <Screen.Header style={styles.header}>
                <Screen.Header.BackButton type="translucent" />
                <Screen.Header.Title>
                    <View style={styles.title}>
                        <View style={styles.titleRow}>
                            <Text variant="titleS" color="constantWhite" numberOfLines={1}>
                                {symbol}
                            </Text>
                            {isTestnet && (
                                <Badge type="translucent" isUppercase>
                                    {t('portfolio.testnet')}
                                </Badge>
                            )}
                        </View>
                        <Text
                            variant="bodyM"
                            color="constantWhite"
                            numberOfLines={1}
                            ellipsizeMode="middle"
                            style={styles.address}
                            skeletonWidth={address === undefined ? 120 : undefined}
                        >
                            {address}
                        </Text>
                    </View>
                </Screen.Header.Title>
            </Screen.Header>
            <View style={styles.balance}>
                <View style={styles.amountRow}>
                    <Text variant="displayL" color="constantWhite" skeleton>
                        {amount}
                    </Text>
                    <Text variant="bodyL" color="constantWhite" style={styles.secondary}>
                        {symbol}
                    </Text>
                </View>
                <Text
                    variant="bodyL"
                    color="constantWhite"
                    textAlign="center"
                    style={styles.secondary}
                    skeletonWidth={fiatAmount === undefined ? 64 : undefined}
                >
                    {fiatAmount}
                </Text>
            </View>
            {actions}
            <View style={styles.divider} />
        </>
    );
};
