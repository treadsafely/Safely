import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

import type { CryptoAsset } from '@safely/core';
import { SPACE } from '@safely/core';
import { useActiveFiat, useMainnetRate, useNumberFormatter } from '@safely/ux';

import type { ChartPeriod } from '@mobile/features/chart/Chart/config';
import { usePriceDiff } from '@mobile/features/chart/Chart/hooks';
import { Text } from '@mobile/shared/ui';

import { styles } from './ChartHeader.styles';
import { PriceDiff } from './PriceDiff';

type ChartHeaderProps = {
    asset: CryptoAsset;
    prices: [number, number][];
    selectedPeriod: ChartPeriod;
    activePrice?: number;
    activePriceDiff?: number | null;
};

export const ChartHeader = (props: ChartHeaderProps) => {
    const { prices, asset, selectedPeriod, activePrice, activePriceDiff } = props;
    const rate = useMainnetRate(asset);
    const fiat = useActiveFiat();
    const formatter = useNumberFormatter();
    const priceDiff = usePriceDiff({ prices, selectedPeriod });

    const formattedRate =
        rate.data &&
        formatter.formatFiat(rate.data.value, {
            currencyDisplay: 'symbol',
            currency: fiat.id.symbol,
            useGrouping: true
        });

    const formattedActivePrice =
        activePrice !== undefined
            ? formatter.formatFiat(activePrice, {
                  currencyDisplay: 'symbol',
                  currency: fiat.id.symbol,
                  useGrouping: true
              })
            : null;

    const displayPrice = formattedActivePrice ?? formattedRate;

    const displayPriceDiff = useMemo(() => {
        return activePriceDiff ?? priceDiff;
    }, [activePriceDiff, priceDiff]);

    const animatedPriceDiffStyle = useAnimatedStyle(
        () => ({
            opacity:
                !activePrice || activePriceDiff
                    ? withTiming(1, { duration: 120, easing: Easing.inOut(Easing.ease) })
                    : withTiming(0.56, { duration: 180, easing: Easing.inOut(Easing.ease) })
        }),
        [activePrice, activePriceDiff]
    );

    return (
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                <Text monospace variant="titleM">
                    {displayPrice ?? '-'}
                </Text>
                <Text style={styles.description} variant="bodyM" color="tertiary">
                    {asset.symbol}
                    {SPACE.THSP}/{SPACE.THSP}
                    {fiat.id.symbol}
                </Text>
            </View>
            <Animated.View style={animatedPriceDiffStyle}>
                <PriceDiff priceDiff={displayPriceDiff} />
            </Animated.View>
        </View>
    );
};
