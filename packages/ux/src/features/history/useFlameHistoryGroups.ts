import { useMemo } from 'react';

import type { FlameHistoryItem } from '@safely/core';

import { buildFlameHistoryGroupViews } from './activity-row-view';
import type { HistoryGroupView } from './types';
import { useActivityRowContext } from './useActivityRowContext';
import { useGroupedFlameHistory } from '../../entities';

export function useFlameHistoryGroups() {
    const context = useActivityRowContext();

    const {
        data: historyGroups,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch
    } = useGroupedFlameHistory();

    const groups = useMemo<HistoryGroupView<FlameHistoryItem>[] | undefined>(
        () => historyGroups && buildFlameHistoryGroupViews(historyGroups, context),
        [historyGroups, context]
    );

    return { groups, fetchNextPage, hasNextPage, isFetchingNextPage, refetch };
}
