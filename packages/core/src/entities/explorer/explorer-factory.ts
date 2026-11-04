import { BtcExplorer } from './btc-explorer';
import type { Explorer } from './explorer';
import { FlameExplorer } from './flame-explorer';
import type { BootConfig } from '../../api/config/models';
import type { FlameNetwork } from '../../di/safely-flame';
import { assertUnreachable } from '../../utils';
import { BLOCKCHAIN_NAME, btcNetworkByPortfolioNetworkType } from '../blockchain';
import type { PortfolioNetworkType } from '../portfolio/portfolio-network-type';

export class ExplorerFactory {
    constructor(private readonly config: BootConfig['blockchains']) {}

    public createExplorer(
        blockchain: BLOCKCHAIN_NAME.BTC,
        networkType: PortfolioNetworkType
    ): BtcExplorer;
    public createExplorer(
        blockchain: BLOCKCHAIN_NAME.FLAME,
        network: FlameNetwork
    ): FlameExplorer | null;
    public createExplorer(
        blockchain: BLOCKCHAIN_NAME,
        network: PortfolioNetworkType | FlameNetwork
    ): Explorer | null {
        switch (blockchain) {
            case BLOCKCHAIN_NAME.BTC:
                return new BtcExplorer(
                    this.config.bitcoin[
                        btcNetworkByPortfolioNetworkType(network as PortfolioNetworkType)
                    ]!
                );
            case BLOCKCHAIN_NAME.FLAME: {
                const config = this.config.flame?.[network as FlameNetwork];
                return config ? new FlameExplorer(config) : null;
            }
            default:
                assertUnreachable(blockchain);
        }
    }
}
