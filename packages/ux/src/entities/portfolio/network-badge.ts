import type { Portfolio } from '@safely/core';
import { PortfolioNetworkType, PortfolioType } from '@safely/core';

import { useActivePortfolioEntitiesQuery } from './portfolios';

export type PortfolioNetworkBadge = {
    labelKey: string;
    tone: 'neutral' | 'purple';
};

const NETWORK_BADGES = {
    testnet: { labelKey: 'portfolio.testnet', tone: 'neutral' },
    flameDevnet: { labelKey: 'portfolio.flameDevnet', tone: 'purple' }
} as const satisfies Record<string, PortfolioNetworkBadge>;

export function resolvePortfolioNetworkBadge(
    portfolio: Partial<Pick<Portfolio, 'type' | 'networkType'>>
): PortfolioNetworkBadge | null {
    if (portfolio.type === PortfolioType.FLAME_DEVNET) {
        return NETWORK_BADGES.flameDevnet;
    }

    if (portfolio.networkType === PortfolioNetworkType.TESTNET) {
        return NETWORK_BADGES.testnet;
    }

    return null;
}

export function useActivePortfolioNetworkBadge(): PortfolioNetworkBadge | null {
    const portfolio = useActivePortfolioEntitiesQuery().data?.portfolio;

    return portfolio ? resolvePortfolioNetworkBadge(portfolio) : null;
}
