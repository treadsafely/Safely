import type { FC } from 'react';
import { useMemo } from 'react';

import type { CryptoAsset } from '@safely/core';
import {
    CHART_CONFIG,
    priceChangeOverPeriod,
    useActiveFiat,
    useMainnetRate,
    useNumberFormatter,
    useTranslate,
    type ChartPeriod
} from '@safely/ux';

import {
    collapseToggleStyles,
    controlsStyles,
    headerRowStyles,
    headerStyles,
    priceGroupStyles
} from './Chart.styles';
import { ChartPeriods } from './ChartPeriods';
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
    isCollapsed: boolean;
    onPeriodChange: (period: ChartPeriod) => void;
    onToggleCollapsed: () => void;
};

export const ChartHeader: FC<ChartHeaderProps> = props => {
    const { asset, prices, period, active, isCollapsed, onPeriodChange, onToggleCollapsed } = props;

    const t = useTranslate();
    const rate = useMainnetRate(asset);
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

    const displayDiff = active?.priceDiff ?? periodDiff;
    const isDiffFaded = active !== null && active.priceDiff === null;

    return (
        <div className={headerStyles}>
            <div className={headerRowStyles}>
                <div className={priceGroupStyles}>
                    <Text variant="bodyL" isTabular>
                        {displayPrice ?? '-'}
                    </Text>
                    <PriceDiff priceDiff={displayDiff} isFaded={isDiffFaded} />
                </div>
                <div className={controlsStyles}>
                    {!isCollapsed && <ChartPeriods value={period} onChange={onPeriodChange} />}
                    <button
                        type="button"
                        className={collapseToggleStyles}
                        onClick={onToggleCollapsed}
                    >
                        {t(isCollapsed ? 'chart.expand' : 'chart.collapse')}
                    </button>
                </div>
            </div>
            <Text variant="bodyM" tone="tertiary">
                {t('chart.title')}
            </Text>
        </div>
    );
};
