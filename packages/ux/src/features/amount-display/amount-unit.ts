import type { CryptoFiatRate } from '@safely/core';

import type { AmountUnit } from './types';

// `undefined` is a rate still loading, so only a known absence of a price overrides the preference
export function resolveAmountUnit(
    preferred: AmountUnit,
    rate: CryptoFiatRate | null | undefined
): AmountUnit {
    return rate === null ? 'crypto' : preferred;
}

export function orderAmounts<T>(unit: AmountUnit, crypto: T, fiat: T | null): [T, T | null] {
    return unit === 'fiat' && fiat !== null ? [fiat, crypto] : [crypto, fiat];
}
