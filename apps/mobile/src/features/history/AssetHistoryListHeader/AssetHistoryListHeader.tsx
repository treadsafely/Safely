import type { ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { CryptoAsset, RatedCryptoAssetAmount } from '@safely/core';
import { useNumberFormatter } from '@safely/ux';

import { GradientBackground, Text, useScreenHeaderHeight } from '@mobile/shared/ui';

import { styles } from './AssetHistoryListHeader.styles';
import type { HistoryScroll } from '../HistoryList';

const GRADIENT_HEIGHT = 390;

type AssetHistoryListHeaderProps = {
    gradientColor: string;
    asset: CryptoAsset;
    ratedAmount: RatedCryptoAssetAmount | null | undefined;
    actions: ReactNode;
    scroll: HistoryScroll;
};

export const AssetHistoryListHeader = (props: AssetHistoryListHeaderProps) => {
    const { gradientColor, asset, ratedAmount, actions, scroll } = props;
    const formatter = useNumberFormatter();
    const screenHeaderHeight = useScreenHeaderHeight();
    const { height: windowHeight } = useWindowDimensions();
    const overscrollExtent = Platform.OS === 'ios' ? windowHeight : 0;
    const gradientStyle = useAnimatedStyle(() => ({
        opacity: 1 - scroll.fadeProgress.value
    }));
    const { symbol } = asset;
    const amount = ratedAmount?.amount.format(formatter, { currencyDisplay: 'none' });
    const price = ratedAmount?.price;
    const fiatAmount = price && ratedAmount.amount.convert(price).format(formatter);

    return (
        <View style={styles.container({ screenHeaderHeight })}>
            <Animated.View
                style={[styles.gradient({ overscrollExtent }), gradientStyle]}
                pointerEvents="none"
            >
                <GradientBackground
                    color={gradientColor}
                    position="top"
                    height={GRADIENT_HEIGHT + overscrollExtent}
                />
            </Animated.View>
            <View style={styles.content}>
                <View style={styles.balance}>
                    <View style={styles.amountRow}>
                        <Text
                            variant="displayL"
                            color="constantWhite"
                            skeletonVariant="constantWhite"
                        >
                            {amount}
                        </Text>
                        <Text variant="bodyL" color="constantWhite" style={styles.secondary}>
                            {symbol}
                        </Text>
                    </View>
                    {price !== null && (
                        <Text
                            variant="bodyL"
                            color="constantWhite"
                            textAlign="center"
                            style={fiatAmount === undefined ? undefined : styles.secondary}
                            skeletonVariant="constantWhite"
                            skeletonWidth={64}
                        >
                            {fiatAmount}
                        </Text>
                    )}
                </View>
                {actions}
            </View>
        </View>
    );
};
