import type { InfiniteData } from '@tanstack/react-query';

import type { BtcHistoryPage, IBtcHistoryPageParam } from './types';
import { isOrderActivityItem } from './types';
import { useBtcHistory } from './useBtcHistory';

const EMPTY_TXIDS: ReadonlySet<string> = new Set();

const selectOnrampTxids = (
    data: InfiniteData<BtcHistoryPage, IBtcHistoryPageParam>
): ReadonlySet<string> => {
    const txids = new Set<string>();

    for (const page of data.pages) {
        for (const item of page.items) {
            if (isOrderActivityItem(item) && item.order.type === 'onramp' && item.order.txHash) {
                txids.add(item.order.txHash);
            }
        }
    }

    return txids;
};

export function useOnrampTxids(): ReadonlySet<string> {
    const { data } = useBtcHistory({ isInitiator: false }, { select: selectOnrampTxids });

    return data ?? EMPTY_TXIDS;
}
