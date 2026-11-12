import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { CryptoAsset } from '@safely/core';
import type { PortfolioNetworkBadge } from '@safely/ux';

import { NetworkBadge } from '@mobile/entities/portfolio';
import { Screen, Text, useScreenHeaderHeight } from '@mobile/shared/ui';

import { styles } from './AssetHistoryHeader.styles';
import type { HistoryScroll } from '../HistoryList';

type AssetHistoryHeaderProps = {
    asset: CryptoAsset;
    networkBadge: PortfolioNetworkBadge | null;
    address: string | undefined;
    scroll: HistoryScroll;
};

export const AssetHistoryHeader = (props: AssetHistoryHeaderProps) => {
    const { asset, networkBadge, address, scroll } = props;
    const screenHeaderHeight = useScreenHeaderHeight();

    const backdropStyle = useAnimatedStyle(() => ({ opacity: scroll.fadeProgress.value }));
    const hairlineStyle = useAnimatedStyle(() => {
        const dividerOffset = scroll.listHeaderHeight.value - screenHeaderHeight;
        const isDividerUnderHeader = dividerOffset > 0 && scroll.scrollY.value >= dividerOffset;
        return { opacity: isDividerUnderHeader ? 1 : 0 };
    });

    return (
        <Screen.Header
            style={styles.header}
            backdrop={
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <Animated.View style={[styles.hairline, hairlineStyle]} />
                </Animated.View>
            }
            withCompensateHeight={false}
            withCompensateInset={false}
        >
            <Screen.Header.BackButton type="translucent" />
            <Screen.Header.Title>
                <View style={styles.title}>
                    <View style={styles.titleRow}>
                        <Text variant="titleS" color="constantWhite" numberOfLines={1}>
                            {asset.symbol}
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
                        style={address === undefined ? undefined : styles.address}
                        skeletonVariant="constantWhite"
                        skeletonWidth={120}
                    >
                        {address}
                    </Text>
                </View>
            </Screen.Header.Title>
        </Screen.Header>
    );
};
