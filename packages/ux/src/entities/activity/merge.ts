import type { InfiniteData } from '@tanstack/react-query';

import type {
    BtcHistoryPage,
    BtcActivityItem,
    IBtcHistoryFilters,
    IBtcHistoryPageParam
} from './types';
import { isBtcActivityItem, isOrderActivityItem } from './types';

export function prependBroadcastedTx(
    data: InfiniteData<BtcHistoryPage, IBtcHistoryPageParam>,
    item: BtcActivityItem | null,
    filters: IBtcHistoryFilters
): InfiniteData<BtcHistoryPage, IBtcHistoryPageParam> {
    if (!item) {
        return data;
    }

    const alreadyInHistory = data.pages.some(page =>
        page.items.some(
            i => isBtcActivityItem(i) && i.transaction.raw.txid === item.transaction.raw.txid
        )
    );
    if (alreadyInHistory) {
        return data;
    }

    if (filters.isInitiator !== undefined && item.transaction.isInitiator !== filters.isInitiator) {
        return data;
    }

    const firstPage = data.pages[0] ?? { items: [], btcNextPage: null, ordersNextCursor: null };

    return {
        ...data,
        pages: [{ ...firstPage, items: [item, ...firstPage.items] }, ...data.pages.slice(1)]
    };
}

export function dedupeOrderTxs(
    data: InfiniteData<BtcHistoryPage, IBtcHistoryPageParam>
): InfiniteData<BtcHistoryPage, IBtcHistoryPageParam> {
    const orderTxHashes = new Set<string>();
    const btcByTxId = new Map<string, BtcActivityItem['transaction']>();

    for (const page of data.pages) {
        for (const item of page.items) {
            switch (item.type) {
                case 'order':
                    if (item.order.txHash) {
                        orderTxHashes.add(item.order.txHash);
                    }
                    break;
                case 'transaction':
                    btcByTxId.set(item.transaction.raw.txid, item.transaction);
                    break;
            }
        }
    }

    if (orderTxHashes.size === 0) {
        return data;
    }

    const hasMatches = data.pages.some(page =>
        page.items.some(
            item => isBtcActivityItem(item) && orderTxHashes.has(item.transaction.raw.txid)
        )
    );

    if (!hasMatches) {
        return data;
    }

    return {
        ...data,
        pages: data.pages.map(page => ({
            ...page,
            items: page.items
                .map(item =>
                    isOrderActivityItem(item) &&
                    item.order.txHash &&
                    btcByTxId.has(item.order.txHash)
                        ? { ...item, transaction: btcByTxId.get(item.order.txHash) }
                        : item
                )
                .filter(
                    item =>
                        !isBtcActivityItem(item) || !orderTxHashes.has(item.transaction.raw.txid)
                )
        }))
    };
}
