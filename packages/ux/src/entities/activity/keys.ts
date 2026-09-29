import type { IActivityFilters } from './types';
import { defineQueryKeys, finalKey } from '../../shared';

export const activityKeys = defineQueryKeys('activity', {
    all: (_walletId: string, _filters: IActivityFilters) => finalKey
});
