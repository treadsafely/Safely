import type { CryptoAsset, CryptoFiatRate, FiatAsset, PriceApi } from '@safely/core';
import { assertUnreachable, BLOCKCHAIN_NAME, Rate, toBig } from '@safely/core';

async function fetchBtcRate(
    priceApi: PriceApi,
    asset: CryptoAsset,
    fiat: FiatAsset
): Promise<CryptoFiatRate> {
    const response = await priceApi.getCurrentPrice({
        token: 'native',
        blockchain: 'bitcoin',
        currency: fiat.id.symbol
    });

    return new Rate(
        asset,
        fiat,
        toBig(response.price),
        undefined,
        String(response.diff_24h),
        undefined
    );
}

export async function fetchMarketRate(
    priceApi: PriceApi,
    asset: CryptoAsset,
    fiat: FiatAsset,
    isTestnet: boolean
): Promise<CryptoFiatRate | null> {
    if (isTestnet) return null;

    const blockchain = asset.id.blockchain;
    switch (blockchain) {
        case BLOCKCHAIN_NAME.BTC:
            return fetchBtcRate(priceApi, asset, fiat);
        case BLOCKCHAIN_NAME.FLAME:
            return null;
        default:
            assertUnreachable(blockchain);
    }
}
