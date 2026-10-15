import { useMemo } from 'react';

import type { FlameNetwork } from '@safely/core';
import { FlameApi } from '@safely/core';

import { useBootConfig } from './useBootConfig';
import { useAppContext } from '../providers';

// TODO: remove once the boot config serves blockchains.flame.testnet.rpc_url
const FALLBACK_RPC_URLS: Partial<Record<FlameNetwork, string>> = {
    testnet: 'https://dev-flamed.safely.app/'
};

export function useFlameApi(network: FlameNetwork | undefined): FlameApi | null {
    const { blockchains } = useBootConfig();
    const { logger } = useAppContext();

    const rpcUrl = network
        ? (blockchains.flame?.[network]?.rpc_url ?? FALLBACK_RPC_URLS[network])
        : undefined;

    return useMemo(() => (rpcUrl ? new FlameApi({ rpcUrl, logger }) : null), [rpcUrl, logger]);
}
