import { useMemo } from 'react';

import { BTC_ASSET } from '@safely/core';

import { buildBtcHistoryGroupViews } from './activity-row-view';
import type { HistoryGroupView } from './types';
import { useActivityRowContext } from './useActivityRowContext';
import { useActivePortfolioRate, useGroupedBtcHistory } from '../../entities';

export function useBtcHistoryGroups() {
    const context = useActivityRowContext();
    const { data: rate } = useActivePortfolioRate(BTC_ASSET);

    const {
        data: historyGroups,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch
    } = useGroupedBtcHistory();

    const groups = useMemo<HistoryGroupView[] | undefined>(
        () => historyGroups && buildBtcHistoryGroupViews(historyGroups, { ...context, rate }),
        [historyGroups, context, rate]
    );

    return { groups, fetchNextPage, hasNextPage, isFetchingNextPage, refetch };
}
