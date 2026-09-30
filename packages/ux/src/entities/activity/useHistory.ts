import type { InfiniteData, QueryKey } from '@tanstack/react-query';
import { useCallback } from 'react';

import { BTC_ASSET } from '@safely/core';

import { fetchBtcActivity, fetchOrdersActivity } from './api';
import { activityKeys } from './keys';
import { dedupeOrderTxs, prependBroadcastedTx } from './merge';
import {
    INITIAL_ACTIVITY_PAGE_PARAM,
    buildActivityPage,
    getNextActivityPageParam
} from './pagination';
import type { ActivityPage, IActivityFilters, IActivityPageParam, IHistoryOptions } from './types';
import { applyActivityWaterline } from './waterline';
import {
    QUERIES_STALE_TIME,
    useAppContext,
    useBtcApi,
    useExchangeApi,
    useInfinitePersistQuery,
    useUserCountryInfo
} from '../../shared';
import { useActivePortfolioRate } from '../asset';
import { useLastBroadcastedBtcTx } from '../btc-blockchain';
import { useReadOnlyRequestSigner } from '../exchange';
import { useActiveFiat } from '../fiat/useActiveFiat';
import { useActiveBtcWallet } from '../portfolio';

export function useHistory<TData = InfiniteData<ActivityPage, IActivityPageParam>>(
    filters: IActivityFilters = {},
    options?: IHistoryOptions<TData>
) {
    const btcWallet = useActiveBtcWallet();
    const btcApi = useBtcApi(btcWallet.network);
    const fiat = useActiveFiat();
    const signer = useReadOnlyRequestSigner();
    const exchangeApi = useExchangeApi(signer);

    const { i18n, logger } = useAppContext();
    const userCountryInfo = useUserCountryInfo();
    const broadcastedTx = useLastBroadcastedBtcTx();
    const { data: rate } = useActivePortfolioRate(BTC_ASSET);
    const broadcastedTxRate = broadcastedTx ? (rate ?? null) : null;

    const ordersRequest = {
        lang: i18n.language,
        storeCountryCode: userCountryInfo.storeCode,
        deviceCountryCode: userCountryInfo.deviceCode
    };
    const ordersFailed = (error: unknown) => {
        logger.warn('ramp orders page failed', error);
        return 'failed' as const;
    };

    return useInfinitePersistQuery<ActivityPage, unknown, TData, QueryKey, IActivityPageParam>({
        queryKey: activityKeys.all(btcWallet.id.toString(), fiat.id.toString(), filters).toKey(),
        staleTime: QUERIES_STALE_TIME.ACTIVITY,
        queryFn: async ({ pageParam }) => {
            const { fetch, btcPage, ordersCursor } = pageParam;

            const [btcResult, ordersResult] = await Promise.all([
                ['btc', 'both'].includes(fetch) && btcPage !== null
                    ? fetchBtcActivity(btcApi, btcWallet, fiat, btcPage, filters)
                    : null,
                ['orders', 'both'].includes(fetch) && signer
                    ? fetchOrdersActivity(exchangeApi, ordersRequest, ordersCursor, filters).catch(
                          ordersFailed
                      )
                    : null
            ]);

            return buildActivityPage({ pageParam, btcResult, ordersResult });
        },
        getNextPageParam: getNextActivityPageParam,
        initialPageParam: INITIAL_ACTIVITY_PAGE_PARAM,
        schemaKey: 'infiniteActivityData',
        select: useCallback(
            (data: InfiniteData<ActivityPage, IActivityPageParam>) => {
                const patched = prependBroadcastedTx(
                    data,
                    broadcastedTx?.toActivityItem(btcWallet.address, broadcastedTxRate) ?? null,
                    filters
                );

                const visible = dedupeOrderTxs(applyActivityWaterline(patched));
                return options?.select ? options.select(visible) : (visible as TData);
            },
            [
                broadcastedTx,
                broadcastedTxRate,
                options?.select,
                filters.isInitiator,
                btcWallet.address
            ]
        )
    });
}
