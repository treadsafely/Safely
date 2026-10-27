import type { InfiniteData } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { BtcHistoryPage, IBtcHistoryPageParam } from './types';
import { useBtcHistory } from './useBtcHistory';

export function useHasBtcHistory() {
    return useBtcHistory(
        {},
        {
            select: useCallback((data: InfiniteData<BtcHistoryPage, IBtcHistoryPageParam>) => {
                return !!data?.pages?.some(p => p.items.length);
            }, [])
        }
    );
}
