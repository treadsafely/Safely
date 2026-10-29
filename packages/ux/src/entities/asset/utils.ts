import type { FiatAsset, RatedCryptoAssetAmount } from '@safely/core';
import { FiatAssetAmount } from '@safely/core';
import { toBig } from '@safely/core';

export function calculateTotalBalance(
    assets: RatedCryptoAssetAmount[],
    fiat: FiatAsset
): FiatAssetAmount | null {
    const fiatAmounts = assets.flatMap(({ amount, price }) =>
        price ? [amount.convert(price).amount] : []
    );
    if (fiatAmounts.length === 0) return null;

    const sum = fiatAmounts.reduce((acc, value) => acc.plus(value), toBig(0));

    return new FiatAssetAmount({ asset: fiat, amount: sum });
}
