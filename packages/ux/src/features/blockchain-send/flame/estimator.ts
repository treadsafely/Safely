import { useMemo } from 'react';

import type { FlameWallet } from '@safely/core';
import { FlameEstimator } from '@safely/core';

import { useAppContext, useFlameApi } from '../../../shared';

export function useFlameEstimator(flameWallet: FlameWallet | null): FlameEstimator | null {
    const api = useFlameApi(flameWallet?.network);
    const { logger } = useAppContext();

    return useMemo(
        () => (flameWallet && api ? new FlameEstimator(api, flameWallet, logger) : null),
        [flameWallet, api, logger]
    );
}
