import type {
    BtcHistoryItem,
    BtcHistoryPage,
    BtcActivityPage,
    IBtcHistoryPageParam,
    OrdersActivityPage
} from './types';
import { isBtcActivityItem, isOrderActivityItem } from './types';

export const INITIAL_BTC_HISTORY_PAGE_PARAM: IBtcHistoryPageParam = {
    fetch: 'both',
    btcPage: 1,
    ordersCursor: null
};

function minTimestamp(items: { timestamp: number }[]): number {
    return items.reduce((min, item) => Math.min(min, item.timestamp), Infinity);
}

export function getSourceFrontiers(items: BtcHistoryItem[]): { btc: number; orders: number } {
    const dated = items.filter(item => item.timestamp > 0);
    return {
        btc: minTimestamp(dated.filter(isBtcActivityItem)),
        orders: minTimestamp(dated.filter(isOrderActivityItem))
    };
}

export function getNextActivityPageParam(
    lastPage: BtcHistoryPage,
    allPages: BtcHistoryPage[]
): IBtcHistoryPageParam | undefined {
    const carry = { btcPage: lastPage.btcNextPage, ordersCursor: lastPage.ordersNextCursor };

    if (carry.btcPage === null && carry.ordersCursor === null) {
        return undefined;
    }
    if (carry.ordersCursor === null) {
        return { fetch: 'btc', ...carry };
    }
    if (carry.btcPage === null) {
        return { fetch: 'orders', ...carry };
    }

    const frontiers = getSourceFrontiers(allPages.flatMap(page => page.items));

    return { fetch: frontiers.btc >= frontiers.orders ? 'btc' : 'orders', ...carry };
}

export function buildActivityPage(input: {
    pageParam: IBtcHistoryPageParam;
    btcResult: BtcActivityPage | null;
    ordersResult: OrdersActivityPage | 'failed' | null;
}): BtcHistoryPage {
    const { pageParam, btcResult, ordersResult } = input;

    const btcNextPage = btcResult
        ? btcResult.hasNextPage && pageParam.btcPage !== null
            ? pageParam.btcPage + 1
            : null
        : pageParam.btcPage;

    const ordersNextCursor =
        ordersResult === null
            ? pageParam.ordersCursor
            : ordersResult === 'failed'
              ? null
              : ordersResult.nextCursor;

    const orderItems = ordersResult === null || ordersResult === 'failed' ? [] : ordersResult.items;

    return {
        items: [...(btcResult?.items ?? []), ...orderItems],
        btcNextPage,
        ordersNextCursor
    };
}
