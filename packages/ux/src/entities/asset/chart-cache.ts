import type { QueryClient } from '@tanstack/react-query';

import { assetKeys } from './keys';
import { ChartPeriod, chartStartDate } from '../../shared';

export function removeStaleChartQueries(
    queryClient: QueryClient,
    assetId: string,
    startDate: number
): void {
    const current = new Set(Object.values(ChartPeriod).map(p => chartStartDate(p).toString()));
    current.add(startDate.toString());

    queryClient.removeQueries({
        queryKey: assetKeys.chart(assetId).toKey(),
        predicate: query => !current.has(String(query.queryKey.at(-1)))
    });
}
