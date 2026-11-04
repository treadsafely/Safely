import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { defineQueryKeys, finalKey } from '../query-core';
import { useSharedUxStorage } from '../storage';

const chartCollapsedKeys = defineQueryKeys('chartCollapsed', {
    state: finalKey
});

export function useChartCollapsedQuery() {
    const { get } = useSharedUxStorage('chartCollapsed');

    return useQuery({
        queryKey: chartCollapsedKeys.state.toKey(),
        queryFn: async () => (await get()) ?? false,
        staleTime: Infinity
    });
}

export function useSetChartCollapsed() {
    const queryClient = useQueryClient();
    const { set } = useSharedUxStorage('chartCollapsed');

    return useMutation({
        mutationFn: (isCollapsed: boolean) => set(isCollapsed),
        onSuccess(_data, isCollapsed) {
            queryClient.setQueryData(chartCollapsedKeys.state.toKey(), isCollapsed);
        }
    });
}
