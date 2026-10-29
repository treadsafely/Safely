import type { InfiniteData } from '@tanstack/react-query';
import { useCallback } from 'react';

import { groupByDateWithPending } from '@safely/core';

import { isActivityItemPending } from './pending';
import type {
    BtcHistoryItem,
    BtcHistoryItemsDatedGroup,
    BtcHistoryPage,
    IBtcHistoryFilters,
    IBtcHistoryPageParam
} from './types';
import { useBtcHistory } from './useBtcHistory';

export function useGroupedBtcHistory(filters: IBtcHistoryFilters = {}) {
    return useBtcHistory<BtcHistoryItemsDatedGroup[]>(filters, {
        select: useCallback((data: InfiniteData<BtcHistoryPage, IBtcHistoryPageParam>) => {
            if (!data?.pages?.length) {
                return [];
            }

            const allItems = data.pages.flatMap(page => page.items);

            return groupBtcActivityItems(allItems);
        }, [])
    });
}

export function groupBtcActivityItems(items: BtcHistoryItem[]): BtcHistoryItemsDatedGroup[] {
    return groupByDateWithPending(items, item => item.timestamp, {
        order: 'desc',
        getIsPending: isActivityItemPending
    });
}
