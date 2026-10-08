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

export const FLAME_RECEIVING_KEY_PATH: FlameKeyPath = { branch: 0, index: 0 };

// Scalar::ONE in its 32-byte little-endian encoding
export const FLAME_NATIVE_FLAVOR = '01' + '00'.repeat(31);
