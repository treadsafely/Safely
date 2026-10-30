import { useMemo } from 'react';

import { priceChangeOverPeriod } from '@safely/ux';

import type { ChartPeriod } from '../config';
import { CHART_CONFIG } from '../config';

type UsePriceDiffParams = {
    prices: [number, number][];
    selectedPeriod: ChartPeriod;
};

export const usePriceDiff = (params: UsePriceDiffParams): number | null => {
    const { prices, selectedPeriod } = params;

    return useMemo(
        () =>
            priceChangeOverPeriod(
                prices,
                Date.now() - CHART_CONFIG[selectedPeriod].fullPeriodLength
            ),
        [prices, selectedPeriod]
    );
};
