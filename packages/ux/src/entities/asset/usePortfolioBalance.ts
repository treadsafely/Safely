import type { BtcWallet } from '@safely/core';

import { useDerivedQuery } from '../../shared';
import { useActiveFiat } from '../fiat';
import { useBtcRatedAmount } from './useBtcRatedAmount';
import { calculateTotalBalance } from './utils';

export function useBtcWalletFiatBalance(wallet: BtcWallet) {
    const btcQuery = useBtcRatedAmount(wallet);
    const fiat = useActiveFiat();

    return useDerivedQuery({
        queries: [btcQuery],
        queryFn: ([btc]) => calculateTotalBalance([btc], fiat)
    });
}
