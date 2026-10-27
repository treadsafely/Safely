import type { CryptoAsset, CryptoFiatRate, FiatAsset, Rate } from '@safely/core';

import { assetKeys } from './keys';
import { fetchMarketRate } from './rateQuery';
import { usePersistQuery, usePriceApi } from '../../shared';
import { useActiveFiat } from '../fiat/useActiveFiat';
import { useIsActivePortfolioTestnet } from '../portfolio';

export function useRate<T extends CryptoAsset>(asset: T, isTestnet: boolean) {
    const fiat = useActiveFiat();
    const priceApi = usePriceApi();

    return usePersistQuery<CryptoFiatRate | null, unknown, Rate<T, FiatAsset> | null>({
        queryKey: assetKeys
            .marketRate(asset.id.toString())
            .fiat(fiat.id.toString())
            .params({ isTestnet })
            .toKey(),
        queryFn: () => fetchMarketRate(priceApi, asset, fiat, isTestnet),
        select: rate => rate as Rate<T, FiatAsset> | null,
        schemaKey: 'sCryptoFiatRate'
    });
}

export function useActivePortfolioRate<T extends CryptoAsset>(asset: T) {
    return useRate(asset, useIsActivePortfolioTestnet());
}

export function useMainnetRate<T extends CryptoAsset>(asset: T) {
    return useRate(asset, false);
}
