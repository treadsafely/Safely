import type {
    BtcApi,
    BtcApiTx,
    BtcApiTxWithBtcRate,
    BtcAsset,
    BtcWalletReadOnly,
    CryptoFiatRate,
    ExchangeApi,
    FiatAsset,
    RampOrder,
    TransactionFeeCrypto
} from '@safely/core';
import {
    BTC_ASSET,
    BtcAssetAmount,
    CryptoAssetAmount,
    Rate,
    toBig,
    toBigOrZero
} from '@safely/core';

import type {
    BtcActivityItem,
    BtcActivityPage,
    IActivityFilters,
    OrderActivityItem,
    OrdersActivityPage
} from './types';

const ON_PAGE_ELEMENTS_LIMIT = 25;

export function getBiggestBtcIOAddress(io: BtcApiTx['vin' | 'vout']) {
    return io.slice().sort((a, b) => toBigOrZero(b.value).cmp(toBigOrZero(a.value)))[0]
        ?.addresses?.[0];
}

export function btcTxToActivityItem(
    tx: BtcApiTx,
    rate: CryptoFiatRate | null
): BtcActivityItem | null {
    const isInitiator = !!tx.vin?.some(input => input.isOwn);

    const fromAddress = getBiggestBtcIOAddress(
        tx.vin.filter(v => Boolean(v.isOwn) === isInitiator)
    );

    const toAddress =
        getBiggestBtcIOAddress(tx.vout.filter(v => Boolean(v.isOwn) === !isInitiator)) ??
        getBiggestBtcIOAddress(tx.vout);

    if (!fromAddress || !toAddress) {
        return null;
    }

    const weiAmount = tx.vout
        .filter(v => Boolean(v.isOwn) === !isInitiator)
        .reduce((acc, v) => acc.plus(toBigOrZero(v.value)), toBig(0));

    let fee: TransactionFeeCrypto<BtcAsset> | undefined;
    try {
        if (tx.fees) {
            fee = {
                type: 'crypto',
                amount: BtcAssetAmount.fromWeiAmount(tx.fees)
            };
        }
    } catch {
        //
    }

    return {
        type: 'transaction',
        key: tx.txid,
        timestamp: (tx.blockTime || 0) * 1000,
        transaction: {
            isInitiator,
            fromAddress,
            toAddress,
            value: BtcAssetAmount.fromWeiAmount(weiAmount),
            fee,
            rate,
            raw: tx
        }
    };
}

export function orderToActivityItem(order: RampOrder): OrderActivityItem {
    let cryptoAmount: CryptoAssetAmount | null = null;
    try {
        cryptoAmount = new CryptoAssetAmount({
            asset: BTC_ASSET,
            relativeAmount: order.cryptoAmount
        });
    } catch {
        //
    }

    return {
        type: 'order',
        key: order.id,
        timestamp: order.createdAt * 1000,
        cryptoAmount,
        order
    };
}

const ACTIVE_ORDER_STATUSES: ReadonlySet<RampOrder['status']> = new Set(['pending', 'processing']);

export function isRampOrderActive(order: Pick<RampOrder, 'status'>): boolean {
    return ACTIVE_ORDER_STATUSES.has(order.status);
}

function historicalRate(tx: BtcApiTxWithBtcRate, fiat: FiatAsset): CryptoFiatRate | null {
    return tx.btcRate === undefined ? null : new Rate(BTC_ASSET, fiat, toBig(tx.btcRate));
}

export async function fetchBtcActivity(
    btcApi: BtcApi,
    wallet: Pick<BtcWalletReadOnly, 'type' | 'xpub' | 'address'>,
    fiat: FiatAsset,
    page: number,
    filters: IActivityFilters
): Promise<BtcActivityPage> {
    const pageNum = page >= 1 ? page : 1;

    const addressData = await btcApi.getAddressInfo(wallet, {
        details: 'txs',
        page: pageNum,
        pageSize: ON_PAGE_ELEMENTS_LIMIT,
        currency: fiat.id.symbol
    });

    if (!addressData?.transactions || addressData.transactions.length === 0) {
        return { items: [], hasNextPage: false };
    }

    const items: BtcActivityItem[] = addressData.transactions
        .map(tx => btcTxToActivityItem(tx, historicalRate(tx, fiat)))
        .filter((item): item is BtcActivityItem => item !== null)
        .filter(tx => {
            if (filters.isInitiator !== undefined) {
                return tx.transaction.isInitiator === filters.isInitiator;
            }
            return true;
        });

    const currentPage = addressData.page ?? 1;
    const totalPages = addressData.totalPages ?? 0;
    const hasNextPage = totalPages > 0 && currentPage < totalPages;

    return { items, hasNextPage };
}

export async function fetchOrdersActivity(
    exchangeApi: ExchangeApi,
    request: { lang: string; storeCountryCode?: string | null; deviceCountryCode?: string | null },
    cursor: string | null,
    filters: IActivityFilters
): Promise<OrdersActivityPage> {
    const result = await exchangeApi.getRampOrders({
        ...request,
        blockchain: 'bitcoin',
        limit: ON_PAGE_ELEMENTS_LIMIT,
        before: cursor ?? undefined
    });

    const items = result.orders
        .filter(
            order =>
                filters.isInitiator === undefined ||
                (order.type === 'offramp') === filters.isInitiator
        )
        .map(orderToActivityItem);

    const nextCursor = result.orders.length > 0 ? (result.cursor ?? null) : null;

    return { items, nextCursor };
}
