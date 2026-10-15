import { useMemo } from 'react';

import { FlameEstimator } from '@safely/core';

import { useActiveFlameSource } from '../../../entities';
import { useAppContext, useFlameApi } from '../../../shared';

export function useFlameEstimator(): FlameEstimator | null {
    const source = useActiveFlameSource();
    const api = useFlameApi(source?.chain.network);
    const { logger } = useAppContext();

    return useMemo(
        () => (source && api ? new FlameEstimator(api, source.chain, logger) : null),
        [source, api, logger]
    );
}
