import { useMemo } from 'react';

import type { SignableBtcWallet } from '@safely/core';
import { BtcEstimator, BtcNetwork } from '@safely/core';

import { useAppContext, useBtcApi } from '../../../shared';

export function useBtcEstimator(btcWallet: SignableBtcWallet | null): BtcEstimator | null {
    const btcApi = useBtcApi(btcWallet?.network ?? BtcNetwork.MAINNET);
    const { logger } = useAppContext();

    return useMemo(
        () => btcWallet && new BtcEstimator(btcApi, btcWallet, logger),
        [btcApi.id, btcWallet?.id, logger]
    );
}
