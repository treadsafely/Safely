import type { BtcApiTx } from '@safely/core';

import { useActualBtcBlockNumber } from '../../btc-blockchain';

export type BtcTransactionDisplayStatus =
    | { type: 'pending' }
    | { type: 'confirmed-recently'; timestamp: Date; confirmations: number }
    | { type: 'confirmed-long-ago'; timestamp: Date };

export function isBtcTransactionPending(tx: Pick<BtcApiTx, 'blockHeight'>): boolean {
    return tx.blockHeight === -1;
}

export function getBtcTransactionDisplayStatus(
    tx: Pick<BtcApiTx, 'blockHeight' | 'confirmations' | 'blockTime'>,
    currentBlockNumber: number | undefined
): BtcTransactionDisplayStatus {
    if (isBtcTransactionPending(tx)) {
        return { type: 'pending' };
    }
    const timestamp = new Date(tx.blockTime * 1000);
    const confirmations =
        currentBlockNumber !== undefined
            ? currentBlockNumber - tx.blockHeight + 1
            : tx.confirmations;
    const confirmedAgoConfirmationsNumber = 6;

    if (confirmations > confirmedAgoConfirmationsNumber) {
        return { type: 'confirmed-long-ago', timestamp };
    }
    return { type: 'confirmed-recently', confirmations, timestamp };
}

export function useBtcTransactionDisplayStatus(
    tx: Pick<BtcApiTx, 'blockHeight' | 'confirmations' | 'blockTime'>
): BtcTransactionDisplayStatus {
    const { data: currentBlockNumber } = useActualBtcBlockNumber();
    return getBtcTransactionDisplayStatus(tx, currentBlockNumber);
}
