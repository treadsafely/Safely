import type { InfiniteData } from '@tanstack/react-query';

import type { NewActivityPollingParams } from './useNewActivityPolling';
import { useNewActivityPolling } from './useNewActivityPolling';
import type { ActivityPage, IActivityFilters, IActivityPageParam } from '../../entities';
import { assetKeys, useHistory } from '../../entities';

export type UseHistoryPollingParams = NewActivityPollingParams & {
    filters?: IActivityFilters;
};

const firstActivityKey = (data: InfiniteData<ActivityPage, IActivityPageParam>) =>
    data.pages[0]?.items[0]?.key;

export function useHistoryPolling(params: UseHistoryPollingParams): void {
    const { filters = {}, ...polling } = params;

    useNewActivityPolling(useHistory(filters), firstActivityKey, {
        ...polling,
        invalidateOnNew: assetKeys.all.toKey()
    });
}
