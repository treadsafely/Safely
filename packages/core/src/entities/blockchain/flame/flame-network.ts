import type { FlameKeyPath, FlameNetwork } from '../../../di/safely-flame';
import { assertUnreachable } from '../../../utils/types';
import { PortfolioNetworkType } from '../../portfolio/portfolio-network-type';

export function flameNetworkByPortfolioNetworkType(
    networkType: PortfolioNetworkType
): FlameNetwork {
    switch (networkType) {
        case PortfolioNetworkType.MAINNET:
            return 'mainnet';
        case PortfolioNetworkType.TESTNET:
            return 'testnet';
        default:
            assertUnreachable(networkType);
    }
}

// the devnet node runs with Flame's testnet address and key formats
export const FLAME_DEVNET_NETWORK: FlameNetwork = 'testnet';

export const FLAME_RECEIVING_KEY_PATH: FlameKeyPath = { branch: 0, index: 0 };
