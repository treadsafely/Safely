import type { FC } from 'react';
import { useMemo, useState } from 'react';

import { BTC_ASSET } from '@safely/core';
import {
    CHART_CONFIG,
    ChartPeriod,
    useChart,
    useChartCollapsedQuery,
    useChartPeriodQuery,
    useSetChartCollapsed,
    useSetChartPeriod
} from '@safely/ux';
import { cx } from '@safely/web-ui/styled-system/css';

import { rootCollapsedStyles, rootStyles, skeletonStyles } from './Chart.styles';
import { ChartFooter } from './ChartFooter';
import { ChartHeader } from './ChartHeader';
import { ChartLine } from './ChartLine';
import { ProviderLabel } from './ProviderLabel';
import type { ChartActive } from './types';

export const Chart: FC = () => {
    const asset = BTC_ASSET;
    const { data: period = ChartPeriod.ONE_MONTH } = useChartPeriodQuery();
    const { mutate: setPeriod } = useSetChartPeriod();
    const { data: isCollapsed = false } = useChartCollapsedQuery();
    const { mutate: setCollapsed } = useSetChartCollapsed();
    const [active, setActive] = useState<ChartActive | null>(null);

    const startDate = useMemo(() => {
        const config = CHART_CONFIG[period];

        return config.startOfPeriod(new Date(Date.now() - config.fullPeriodLength));
    }, [period]);

    const chart = useChart(asset, startDate);
    const prices = chart.data?.prices ?? [];
    const attribution = chart.data?.attribution;

    return (
        <div className={cx(rootStyles, isCollapsed && rootCollapsedStyles)}>
            <ChartHeader
                asset={asset}
                prices={prices}
                period={period}
                active={active}
                isCollapsed={isCollapsed}
                onPeriodChange={next => {
                    setActive(null);
                    setPeriod(next);
                }}
                onToggleCollapsed={() => {
                    setActive(null);
                    setCollapsed(!isCollapsed);
                }}
            />
            {!isCollapsed && (
                <>
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
                </>
            )}
        </div>
    );
};
