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

export interface IBtcHistoryFilters {
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

export type BtcHistoryItem = BtcActivityItem | OrderActivityItem;

export function isBtcActivityItem(item: BtcHistoryItem): item is BtcActivityItem {
    return item.type === 'transaction';
}

export function isOrderActivityItem(item: BtcHistoryItem): item is OrderActivityItem {
    return item.type === 'order';
}

export type BtcHistoryItemsDatedGroup = DatedGroup<
    BtcHistoryItem,
    DateGroupMeta | PendingGroupMeta
>;

export interface IBtcHistoryPageParam {
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

export interface BtcHistoryPage {
    items: BtcHistoryItem[];
    btcNextPage: number | null;
    ordersNextCursor: string | null;
}

export interface IBtcHistoryOptions<TData> {
    select?: (data: InfiniteData<BtcHistoryPage, IBtcHistoryPageParam>) => TData;
}
