import type { InfiniteData } from '@tanstack/react-query';

import { getSourceFrontiers } from './pagination';
import { isActivityItemPending } from './pending';
import type { BtcHistoryItem, BtcHistoryPage, IBtcHistoryPageParam } from './types';

export function applyActivityWaterline(
    data: InfiniteData<BtcHistoryPage, IBtcHistoryPageParam>
): InfiniteData<BtcHistoryPage, IBtcHistoryPageParam> {
    const lastPage = data.pages[data.pages.length - 1];
    if (!lastPage || (lastPage.btcNextPage === null && lastPage.ordersNextCursor === null)) {
        return data;
    }

    const frontiers = getSourceFrontiers(data.pages.flatMap(page => page.items));
    const waterline = Math.max(
        lastPage.btcNextPage !== null ? frontiers.btc : -Infinity,
        lastPage.ordersNextCursor !== null ? frontiers.orders : -Infinity
    );

    const isVisible = (item: BtcHistoryItem) =>
        isActivityItemPending(item) || item.timestamp >= waterline;

    const hasBuried = data.pages.some(page => page.items.some(item => !isVisible(item)));
    if (!hasBuried) {
        return data;
    }

    return {
        ...data,
        pages: data.pages.map(page => ({
            ...page,
            items: page.items.filter(isVisible)
        }))
    };
}
