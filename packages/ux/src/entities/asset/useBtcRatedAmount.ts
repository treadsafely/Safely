import type { BtcWallet, RatedCryptoAssetAmount } from '@safely/core';
import { BTC_ASSET, BtcNetwork } from '@safely/core';

import { useDerivedQuery } from '../../shared';
import { useBtcBalance } from '../btc-blockchain';
import { useActiveBtcWallet } from '../portfolio';
import { useRate } from './useRate';

export function useBtcRatedAmount(wallet: BtcWallet) {
    const balanceQuery = useBtcBalance(wallet);
    const rateQuery = useRate(BTC_ASSET, wallet.network === BtcNetwork.TESTNET);

    return useDerivedQuery({
        queries: [balanceQuery, rateQuery],
        queryFn: ([balance, price]): RatedCryptoAssetAmount => ({ amount: balance.display, price })
    });
}

export function useActiveBtcRatedAmount() {
    return useBtcRatedAmount(useActiveBtcWallet());
}
