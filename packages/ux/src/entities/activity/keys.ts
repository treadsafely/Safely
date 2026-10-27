import type { IBtcHistoryFilters } from './types';
import { defineQueryKeys, finalKey } from '../../shared';

export const btcActivityKeys = defineQueryKeys('activity', {
    all: (_walletId: string, _fiatId: string, _filters: IBtcHistoryFilters) => finalKey
});
