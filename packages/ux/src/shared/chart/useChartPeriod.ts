import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ChartPeriod } from './config';
import { defineQueryKeys, finalKey } from '../query-core';
import { useSharedUxStorage } from '../storage';

const chartPeriodKeys = defineQueryKeys('chartPeriod', {
    selected: finalKey
});

const DEFAULT_PERIOD = ChartPeriod.ONE_MONTH;

export function useChartPeriodQuery() {
    const { get } = useSharedUxStorage('chartPeriod');

    return useQuery({
        queryKey: chartPeriodKeys.selected.toKey(),
        queryFn: async () => {
            const period = await get();
            return (period as ChartPeriod) ?? DEFAULT_PERIOD;
        },
        staleTime: Infinity
    });
}

export function useSetChartPeriod() {
    const queryClient = useQueryClient();
    const { set } = useSharedUxStorage('chartPeriod');

    return useMutation({
        mutationFn: async (period: ChartPeriod) => {
            await set(period);
        },
        onSuccess(_data, period) {
            queryClient.setQueryData(chartPeriodKeys.selected.toKey(), period);
        }
    });
}
