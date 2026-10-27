import type { FlameWallet, RatedCryptoAssetAmount } from '@safely/core';
import { FLAME_ASSET, Rate, toBig } from '@safely/core';

import type { DerivedQueryResult } from '../../shared';
import { useDerivedQuery } from '../../shared';
import { useActiveFiat } from '../fiat';
import { useFlameWalletOutputs } from '../flame-blockchain';
import { useActiveFlameWallet } from '../portfolio';

export function useFlameRatedAmount(
    flameWallet: FlameWallet | null
): DerivedQueryResult<RatedCryptoAssetAmount | null> {
    const outputsQuery = useFlameWalletOutputs(flameWallet);
    const fiat = useActiveFiat();

    return useDerivedQuery({
        queries: [outputsQuery],
        queryFn: ([data]): RatedCryptoAssetAmount | null =>
            data && {
                // TODO: expose `outputs.hasUnreadableUnspent` — unreadable unspent outputs are silently left out of the balance
                amount: data.balance,
                price: new Rate(FLAME_ASSET, fiat, toBig(0))
            }
    });
}

export function useActiveFlameRatedAmount() {
    return useFlameRatedAmount(useActiveFlameWallet());
}
