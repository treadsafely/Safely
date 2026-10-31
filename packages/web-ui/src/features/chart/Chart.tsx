import type { FC } from 'react';
import { useMemo, useState } from 'react';

import { BTC_ASSET } from '@safely/core';
import {
    CHART_CONFIG,
    ChartPeriod,
    useChart,
    useChartPeriodQuery,
    useSetChartPeriod
} from '@safely/ux';

import { rootStyles, skeletonStyles } from './Chart.styles';
import { ChartFooter } from './ChartFooter';
import { ChartHeader } from './ChartHeader';
import { ChartLine } from './ChartLine';
import { ChartPeriods } from './ChartPeriods';
import { ProviderLabel } from './ProviderLabel';
import type { ChartActive } from './types';

export const Chart: FC = () => {
    const asset = BTC_ASSET;
    const { data: period = ChartPeriod.ONE_MONTH } = useChartPeriodQuery();
    const { mutate: setPeriod } = useSetChartPeriod();
    const [active, setActive] = useState<ChartActive | null>(null);

    const startDate = useMemo(() => {
        const config = CHART_CONFIG[period];

        return config.startOfPeriod(new Date(Date.now() - config.fullPeriodLength));
    }, [period]);

    const chart = useChart(asset, startDate);
    const prices = chart.data?.prices ?? [];
    const attribution = chart.data?.attribution;

    return (
        <div className={rootStyles}>
            <ChartHeader asset={asset} prices={prices} period={period} active={active} />
            <ChartPeriods
                value={period}
                onChange={next => {
                    setActive(null);
                    setPeriod(next);
                }}
            />
            {chart.isLoading ? (
                <div className={skeletonStyles} />
            ) : (
                <ChartLine
                    prices={prices}
                    period={period}
                    startDate={startDate}
                    onActiveChange={setActive}
                />
            )}
            <ChartFooter period={period} startDate={startDate} active={active} />
            {attribution?.label !== undefined && (
                <ProviderLabel label={attribution.label} link={attribution.link} />
            )}
        </div>
    );
};
