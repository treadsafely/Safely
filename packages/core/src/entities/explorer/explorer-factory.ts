import { BtcExplorer } from './btc-explorer';
import type { Explorer } from './explorer';
import type { BootConfig } from '../../api/config/models';
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
        blockchain: BLOCKCHAIN_NAME.BTC,
        networkType: PortfolioNetworkType
    ): Explorer {
        switch (blockchain) {
            case BLOCKCHAIN_NAME.BTC:
                return new BtcExplorer(
                    this.config.bitcoin[btcNetworkByPortfolioNetworkType(networkType)]!
                );
            default:
                assertUnreachable(blockchain);
        }
    }
}
