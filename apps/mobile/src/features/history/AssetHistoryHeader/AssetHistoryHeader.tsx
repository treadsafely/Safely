import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { PortfolioNetworkBadge } from '@safely/ux';

import { NetworkBadge } from '@mobile/entities/portfolio';
import { GradientBackground, Screen, Text } from '@mobile/shared/ui';

import { styles } from './AssetHistoryHeader.styles';

const GRADIENT_HEIGHT = 390;

type AssetHistoryHeaderProps = {
    gradientColor: string;
    symbol: string;
    networkBadge: PortfolioNetworkBadge | null;
    address: string | undefined;
    amount: string | undefined;
    fiatAmount: string | undefined;
    actions: ReactNode;
};

export const AssetHistoryHeader = (props: AssetHistoryHeaderProps) => {
    const { gradientColor, symbol, networkBadge, address, amount, fiatAmount, actions } = props;

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
                            {networkBadge && (
                                <NetworkBadge badge={networkBadge} neutralType="translucent" />
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
