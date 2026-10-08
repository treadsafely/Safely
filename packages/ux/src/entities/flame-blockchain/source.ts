import { useMemo } from 'react';

import type { BtcWallet, IDerivationChainItemFlame } from '@safely/core';
import { PortfolioBip39 } from '@safely/core';

import { useActiveBtcWallet } from '../portfolio';

export type FlameSource = {
    chain: IDerivationChainItemFlame;
    portfolio: PortfolioBip39;
};

export function resolveFlameSource(btcWallet: BtcWallet): FlameSource | null {
    if (!('derivationRef' in btcWallet)) return null;

    const { chains, portfolioRef } = btcWallet.derivationRef;
    if (!chains.flame || !(portfolioRef instanceof PortfolioBip39)) return null;

    return { chain: chains.flame, portfolio: portfolioRef };
}

export function useActiveFlameSource(): FlameSource | null {
    const btcWallet = useActiveBtcWallet();
    return useMemo(() => resolveFlameSource(btcWallet), [btcWallet]);
}
