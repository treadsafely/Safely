import type { Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME } from '@safely/core';

import type { ConfirmationState } from './ConfirmationScreen.types';

export const IS_ESTIMATE_ENABLED_BY_CHAIN: Record<
    Recipient['blockchain'],
    (state: ConfirmationState['type']) => boolean
> = {
    [BLOCKCHAIN_NAME.BTC]: state => state !== 'success',
    // a Flame send marks its inputs as spent, so a re-estimate after it would see too little balance
    [BLOCKCHAIN_NAME.FLAME]: state => state === 'idle'
};
