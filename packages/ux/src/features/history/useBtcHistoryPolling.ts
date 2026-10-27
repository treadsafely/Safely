import type { InfiniteData } from '@tanstack/react-query';

import type { NewActivityPollingParams } from './useNewActivityPolling';
import { useNewActivityPolling } from './useNewActivityPolling';
import type { BtcHistoryPage, IBtcHistoryFilters, IBtcHistoryPageParam } from '../../entities';
import { assetKeys, useBtcHistory } from '../../entities';

export type UseBtcHistoryPollingParams = NewActivityPollingParams & {
    filters?: IBtcHistoryFilters;
};

const firstActivityKey = (data: InfiniteData<BtcHistoryPage, IBtcHistoryPageParam>) =>
    data.pages[0]?.items[0]?.key;

export function useBtcHistoryPolling(params: UseBtcHistoryPollingParams): void {
    const { filters = {}, ...polling } = params;

    useNewActivityPolling(useBtcHistory(filters), firstActivityKey, {
        ...polling,
        invalidateOnNew: assetKeys.all.toKey()
    });
}
