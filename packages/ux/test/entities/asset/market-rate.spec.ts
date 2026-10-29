import { describe, expect, it, vi } from 'vitest';

import {
    BTC_ASSET,
    BtcAssetAmount,
    FiatAsset,
    FiatAssetId,
    FLAME_ASSET,
    FlameAssetAmount,
    type PriceApi,
    Rate,
    toBig
} from '@safely/core';

import { fetchMarketRate } from '../../../src/entities/asset/rateQuery';
import { calculateTotalBalance } from '../../../src/entities/asset/utils';

const USD = new FiatAsset(new FiatAssetId('USD'), 'US Dollar');

const getCurrentPrice = vi.fn(async () => ({ price: 50_000, diff_24h: 1 }));

function makePriceApi(): PriceApi {
    getCurrentPrice.mockClear();

    return { getCurrentPrice } as unknown as PriceApi;
}

describe('fetchMarketRate', () => {
    it('prices mainnet BTC from the price API', async () => {
        const rate = await fetchMarketRate(makePriceApi(), BTC_ASSET, USD, false);

        expect(rate?.value.eq(50_000)).toBe(true);
    });

    it.each([
        ['testnet BTC', BTC_ASSET, true],
        ['FLM', FLAME_ASSET, false]
    ])('has no price for %s', async (_, asset, isTestnet) => {
        const priceApi = makePriceApi();

        expect(await fetchMarketRate(priceApi, asset, USD, isTestnet)).toBeNull();
        expect(getCurrentPrice).not.toHaveBeenCalled();
    });
});

describe('calculateTotalBalance', () => {
    const btc = {
        amount: BtcAssetAmount.fromRelativeAmount('0.5'),
        price: new Rate(BTC_ASSET, USD, toBig(50_000))
    };
    const flame = { amount: FlameAssetAmount.fromWeiAmount(100n), price: null };

    it('sums only the priced assets', () => {
        expect(calculateTotalBalance([btc, flame], USD)?.amount.eq(25_000)).toBe(true);
    });

    it('is null when no asset has a market price', () => {
        expect(calculateTotalBalance([flame], USD)).toBeNull();
    });
});
