import type { CryptoAsset, CryptoFiatRate, FiatAsset } from '@safely/core';
import { toBig } from '@safely/core';
import { Rate } from '@safely/core';

import { assetKeys } from './keys';
import { getRateFn } from './rateQuery';
import { usePersistQuery, usePriceApi } from '../../shared';
import { useActiveFiat } from '../fiat/useActiveFiat';
import { useIsActivePortfolioTestnet } from '../portfolio';

export function useRate<T extends CryptoAsset>(asset: T, isTestnet: boolean) {
    const fiat = useActiveFiat();
    const priceApi = usePriceApi();

    return usePersistQuery<CryptoFiatRate | null, unknown, Rate<T, FiatAsset> | null>({
        queryKey: assetKeys
            .rate(asset.id.toString())
            .fiat(fiat.id.toString())
            .params({ isTestnet })
            .toKey(),
        queryFn: () =>
            isTestnet ? new Rate(asset, fiat, toBig(0)) : getRateFn(priceApi, asset, fiat),
        select: rate => rate as Rate<T, FiatAsset> | null,
        schemaKey: 'sCryptoFiatRate'
    });
}

export function useActivePortfolioRate<T extends CryptoAsset>(asset: T) {
    return useRate(asset, useIsActivePortfolioTestnet());
}
