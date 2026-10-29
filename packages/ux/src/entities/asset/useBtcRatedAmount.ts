import type { BtcWallet, RatedCryptoAssetAmount } from '@safely/core';
import { BTC_ASSET, BtcNetwork } from '@safely/core';

import type { DerivedQueryResult } from '../../shared';
import { useDerivedQuery } from '../../shared';
import { useBtcBalance } from '../btc-blockchain';
import { useActiveBtcWallet } from '../portfolio';
import { useRate } from './useRate';

export function useBtcRatedAmount(wallet: BtcWallet): DerivedQueryResult<RatedCryptoAssetAmount>;
export function useBtcRatedAmount(
    wallet: BtcWallet | null
): DerivedQueryResult<RatedCryptoAssetAmount | null>;
export function useBtcRatedAmount(
    wallet: BtcWallet | null
): DerivedQueryResult<RatedCryptoAssetAmount | null> {
    const balanceQuery = useBtcBalance(wallet);
    const rateQuery = useRate(BTC_ASSET, wallet?.network !== BtcNetwork.MAINNET);

    return useDerivedQuery({
        queries: [balanceQuery, rateQuery],
        queryFn: ([balance, price]): RatedCryptoAssetAmount | null =>
            balance && { amount: balance.display, price }
    });
}

export function useActiveBtcRatedAmount() {
    return useBtcRatedAmount(useActiveBtcWallet());
}
