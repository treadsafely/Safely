import { useState } from 'react';

import type { ChartPeriod } from './config';
import { CHART_CONFIG } from './config';
import { QUERIES_REFETCH_INTERVAL } from '../query-core';
import { useInterval } from '../react';

export function chartStartDate(period: ChartPeriod): number {
    const config = CHART_CONFIG[period];

    return config.startOfPeriod(new Date(Date.now() - config.fullPeriodLength));
}

/* An interval, not a timeout to the next boundary: a backgrounded timer may never fire, and the next tick catches up. */
export function useChartStartDate(period: ChartPeriod): number {
    const [current, setCurrent] = useState(() => ({ period, startDate: chartStartDate(period) }));

    useInterval(() => {
        const startDate = chartStartDate(period);

        setCurrent(prev =>
            prev.period === period && prev.startDate === startDate ? prev : { period, startDate }
        );
    }, QUERIES_REFETCH_INTERVAL.DEFAULT);

    if (current.period !== period) {
        const next = { period, startDate: chartStartDate(period) };
        setCurrent(next);

        return next.startDate;
    }

    return current.startDate;
}
