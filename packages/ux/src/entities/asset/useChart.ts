import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { CryptoAsset } from '@safely/core';
import type { HistoricalPrice } from '@safely/core/api/price';

import { removeStaleChartQueries } from './chart-cache';
import { assetKeys } from './keys';
import {
    QUERIES_REFETCH_INTERVAL,
    QUERIES_STALE_TIME,
    usePersistQuery,
    usePriceApi
} from '../../shared';
import { useActiveFiat } from '../fiat';

export function useChart(asset: CryptoAsset, startDate: number) {
    const fiat = useActiveFiat();
    const priceApi = usePriceApi();
    const queryClient = useQueryClient();
    const assetId = asset.id.toString();

    /* The persisted cache would otherwise keep a series for every period boundary ever crossed. */
    useEffect(() => {
        removeStaleChartQueries(queryClient, assetId, startDate);
    }, [queryClient, assetId, startDate]);

    return usePersistQuery<HistoricalPrice | null>({
        queryKey: assetKeys
            .chart(assetId)
            .fiat(fiat.id.toString())
            .startDate(startDate.toString())
            .toKey(),
        queryFn: async () => {
            return await priceApi.getHistoricalPrice({
                token: 'native',
                blockchain: 'bitcoin',
                currency: fiat.id.symbol,
                start_date: Math.floor(startDate / 1000),
                end_date: Math.floor(Date.now() / 1000)
            });
        },
        staleTime: QUERIES_STALE_TIME.DEFAULT,
        refetchInterval: QUERIES_REFETCH_INTERVAL.DEFAULT,
        schemaKey: 'sHistoricalPrice'
    });
}
