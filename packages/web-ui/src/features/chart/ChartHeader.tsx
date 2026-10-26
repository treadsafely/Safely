import type { FC } from 'react';
import { useMemo } from 'react';

import type { CryptoAsset } from '@safely/core';
import { SPACE } from '@safely/core';
import {
    CHART_CONFIG,
    priceChangeOverPeriod,
    useActiveFiat,
    useActivePortfolioRate,
    useNumberFormatter,
    type ChartPeriod
} from '@safely/ux';

import { diffWrapStyles, headerStyles, priceStyles } from './Chart.styles';
import { PriceDiff } from './PriceDiff';
import type { ChartActive } from './types';
import { Text } from '../../shared';

function usePeriodDiff(prices: [number, number][], period: ChartPeriod): number | null {
    return useMemo(
        () => priceChangeOverPeriod(prices, Date.now() - CHART_CONFIG[period].fullPeriodLength),
        [prices, period]
    );
}

export type ChartHeaderProps = {
    asset: CryptoAsset;
    prices: [number, number][];
    period: ChartPeriod;
    active: ChartActive | null;
};

export const ChartHeader: FC<ChartHeaderProps> = props => {
    const { asset, prices, period, active } = props;

    const rate = useActivePortfolioRate(asset);
    const fiat = useActiveFiat();
    const formatter = useNumberFormatter();
    const periodDiff = usePeriodDiff(prices, period);

    const priceFormat = {
        currencyDisplay: 'symbol',
        currency: fiat.id.symbol,
        useGrouping: true
    } as const;

    const displayPrice =
        active !== null
            ? formatter.formatFiat(active.price, priceFormat)
            : rate.data != null
              ? formatter.formatFiat(rate.data.value, priceFormat)
              : null;

    const displayDiff = active !== null ? active.priceDiff : periodDiff;

    return (
        <div className={headerStyles}>
            <Text variant="titleM" isTabular className={priceStyles}>
                {displayPrice ?? '-'}
            </Text>
            <Text variant="bodyM" tone="tertiary">
                {asset.symbol}
                {SPACE.THSP}/{SPACE.THSP}
                {fiat.id.symbol}
            </Text>
            <div className={diffWrapStyles}>
                <PriceDiff priceDiff={displayDiff} />
            </div>
        </div>
    );
};
