import type { FlameWallet, RatedCryptoAssetAmount } from '@safely/core';
import { FLAME_ASSET, FlameNetwork } from '@safely/core';

import type { DerivedQueryResult } from '../../shared';
import { useDerivedQuery } from '../../shared';
import { useFlameWalletOutputs } from '../flame-blockchain';
import { useActiveFlameWallet } from '../portfolio';
import { useRate } from './useRate';

export function useFlameRatedAmount(
    flameWallet: FlameWallet | null
): DerivedQueryResult<RatedCryptoAssetAmount | null> {
    const outputsQuery = useFlameWalletOutputs(flameWallet);
    const rateQuery = useRate(FLAME_ASSET, flameWallet?.network !== FlameNetwork.MAINNET);

    return useDerivedQuery({
        queries: [outputsQuery, rateQuery],
        queryFn: ([data, price]): RatedCryptoAssetAmount | null =>
            data && {
                // TODO: expose `outputs.hasUnreadableUnspent` — unreadable unspent outputs are silently left out of the balance
                amount: data.balance,
                price
            }
    });
}

export function useActiveFlameRatedAmount() {
    return useFlameRatedAmount(useActiveFlameWallet());
}
