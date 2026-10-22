import type { FiatAsset, RatedCryptoAssetAmount } from '@safely/core';
import { FiatAssetAmount } from '@safely/core';
import { toBig } from '@safely/core';

export function calculateTotalBalance(
    assets: RatedCryptoAssetAmount[],
    fiat: FiatAsset
): FiatAssetAmount {
    const sum = assets.reduce((acc, { amount, price }) => {
        if (price) {
            return acc.plus(amount.convert(price).amount);
        }
        return acc;
    }, toBig(0));

    return new FiatAssetAmount({ asset: fiat, amount: sum });
}
