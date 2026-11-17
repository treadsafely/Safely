import type { Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME } from '@safely/core';

export type SendConfirmationStatus = 'idle' | 'sending' | 'success' | 'error' | 'estimateError';

const IS_ESTIMATE_ENABLED_BY_CHAIN: Record<
    Recipient['blockchain'],
    (status: SendConfirmationStatus) => boolean
> = {
    [BLOCKCHAIN_NAME.BTC]: status => status !== 'success',
    // a Flame send marks its inputs as spent, so a re-estimate after it would see too little balance
    [BLOCKCHAIN_NAME.FLAME]: status => status === 'idle'
};

export function isSendEstimateEnabled(
    blockchain: Recipient['blockchain'],
    status: SendConfirmationStatus
): boolean {
    return IS_ESTIMATE_ENABLED_BY_CHAIN[blockchain](status);
}
