import { useMemo } from 'react';

import type { FlameNetwork } from '@safely/core';
import { FlameApi } from '@safely/core';

import { useBootConfig } from './useBootConfig';
import { useAppContext } from '../providers';

export function useFlameApi(network: FlameNetwork | undefined): FlameApi | null {
    const { blockchains } = useBootConfig();
    const { logger } = useAppContext();

    const rpcUrl = network ? blockchains.flame?.[network]?.rpc_url : undefined;

    return useMemo(() => (rpcUrl ? new FlameApi({ rpcUrl, logger }) : null), [rpcUrl, logger]);
}
