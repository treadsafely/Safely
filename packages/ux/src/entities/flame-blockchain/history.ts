import type { InfiniteData, QueryKey } from '@tanstack/react-query';
import { skipToken, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { DatedGroup, DateGroupMeta, FlameActivityItem, PendingGroupMeta } from '@safely/core';
import { groupByDateWithPending } from '@safely/core';

import { QUERIES_STALE_TIME, useFlameApi } from '../../shared';
import { useActiveFlameWallet } from '../portfolio';
import type { FlameActivityPage } from './api';
import { fetchFlameActivity } from './api';
import { flameBlockchain } from './keys';

export type FlameHistoryData = InfiniteData<FlameActivityPage, string | null>;

export type FlameActivityItemsDatedGroup = DatedGroup<
    FlameActivityItem,
    DateGroupMeta | PendingGroupMeta
>;

export function useFlameHistory<TData = FlameHistoryData>(options?: {
    select?: (data: FlameHistoryData) => TData;
}) {
    const flameWallet = useActiveFlameWallet();
    const api = useFlameApi(flameWallet.network);

    return useInfiniteQuery<FlameActivityPage, unknown, TData, QueryKey, string | null>({
        queryKey: flameBlockchain
            .history({ walletId: flameWallet.id.toString(), apiId: api?.id ?? null })
            .toKey(),
        queryFn: api
            ? ({ pageParam }) => fetchFlameActivity(api, flameWallet, pageParam)
            : skipToken,
        staleTime: QUERIES_STALE_TIME.ACTIVITY,
        initialPageParam: null,
        getNextPageParam: lastPage => lastPage.older,
        select: options?.select
    });
}

export function groupFlameActivityItems(
    items: FlameActivityItem[]
): FlameActivityItemsDatedGroup[] {
    return groupByDateWithPending(items, item => item.timestamp ?? 0, {
        order: 'desc',
        getIsPending: item => item.isPending
    });
}

export function useGroupedFlameHistory() {
    return useFlameHistory<FlameActivityItemsDatedGroup[]>({
        select: useCallback(
            (data: FlameHistoryData) =>
                groupFlameActivityItems(data.pages.flatMap(page => page.items)),
            []
        )
    });
}
