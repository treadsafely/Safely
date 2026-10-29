import { describe, expect, it } from 'vitest';

import { BTC_ASSET, FiatAsset, FiatAssetId, Rate, toBig } from '@safely/core';

import { orderAmounts, resolveAmountUnit } from '../../../src/features/amount-display';

const USD = new FiatAsset(new FiatAssetId('USD'), 'US Dollar');

describe('resolveAmountUnit', () => {
    it('falls back to crypto for an asset without a market price', () => {
        expect(resolveAmountUnit('fiat', null)).toBe('crypto');
    });

    it('keeps the preference while the rate is loading', () => {
        expect(resolveAmountUnit('fiat', undefined)).toBe('fiat');
    });

    it('keeps the preference for an asset priced at zero', () => {
        expect(resolveAmountUnit('fiat', new Rate(BTC_ASSET, USD, toBig(0)))).toBe('fiat');
    });
});

describe('orderAmounts', () => {
    it('puts fiat first when preferred', () => {
        expect(orderAmounts('fiat', '1 BTC', '$1')).toEqual(['$1', '1 BTC']);
    });

    it('keeps crypto first when there is no fiat amount', () => {
        expect(orderAmounts('fiat', '1 FLM', null)).toEqual(['1 FLM', null]);
    });
});
