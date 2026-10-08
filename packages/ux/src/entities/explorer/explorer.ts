import { useMemo } from 'react';

import {
    type BLOCKCHAIN_NAME,
    type BtcExplorer,
    type Explorer,
    PortfolioNetworkType
} from '@safely/core';
import { ExplorerFactory } from '@safely/core';

import { useBootConfig } from '../../shared';
import { useIsActivePortfolioTestnet } from '../portfolio';

export function useExplorerFactory(): ExplorerFactory {
    const { blockchains } = useBootConfig();

    return useMemo(() => new ExplorerFactory(blockchains), [blockchains]);
}

export function useExplorer(blockchain: BLOCKCHAIN_NAME.BTC): BtcExplorer;
export function useExplorer(blockchain: BLOCKCHAIN_NAME.BTC): Explorer {
    const factory = useExplorerFactory();
    const isTestnetPortfolio = useIsActivePortfolioTestnet();

    return useMemo(
        () =>
            factory.createExplorer(
                blockchain,
                isTestnetPortfolio ? PortfolioNetworkType.TESTNET : PortfolioNetworkType.MAINNET
            ),
        [factory, blockchain, isTestnetPortfolio]
    );
}
