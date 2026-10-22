import type { InfiniteData } from '@tanstack/react-query';

import type {
    BtcApiTx,
    BtcAsset,
    DateGroupMeta,
    DatedGroup,
    FiatAsset,
    PendingGroupMeta,
    RampOrder,
    Rate,
    TransactionFeeCrypto
} from '@safely/core';
import type { CryptoAssetAmount } from '@safely/core';

export interface IActivityFilters {
    isInitiator?: boolean;
}

export interface BtcActivityItem {
    type: 'transaction';
    timestamp: number;
    key: string;
    transaction: {
        isInitiator: boolean;
        fromAddress: string;
        toAddress: string;
        value: CryptoAssetAmount;
        fee: TransactionFeeCrypto<BtcAsset> | undefined;
        rate: Rate<BtcAsset, FiatAsset> | null;
        raw: BtcApiTx;
    };
}

export interface OrderActivityItem {
    type: 'order';
    timestamp: number;
    key: string;
    order: RampOrder;
    cryptoAmount: CryptoAssetAmount | null;
    transaction?: BtcActivityItem['transaction'];
}

export type ActivityItem = BtcActivityItem | OrderActivityItem;

export function isBtcActivityItem(item: ActivityItem): item is BtcActivityItem {
    return item.type === 'transaction';
}

export function isOrderActivityItem(item: ActivityItem): item is OrderActivityItem {
    return item.type === 'order';
}

export type ActivityItemsDatedGroup = DatedGroup<ActivityItem, DateGroupMeta | PendingGroupMeta>;

export interface IActivityPageParam {
    fetch: 'both' | 'btc' | 'orders';
    btcPage: number | null;
    ordersCursor: string | null;
}

export interface BtcActivityPage {
    items: BtcActivityItem[];
    hasNextPage: boolean;
}

export interface OrdersActivityPage {
    items: OrderActivityItem[];
    nextCursor: string | null;
}

export interface ActivityPage {
    items: ActivityItem[];
    btcNextPage: number | null;
    ordersNextCursor: string | null;
}

export interface IHistoryOptions<TData> {
    select?: (data: InfiniteData<ActivityPage, IActivityPageParam>) => TData;
}
