import type { IDerivation, IPortfolioId, Portfolio } from '@safely/core';
import { BLOCKCHAIN_NAME, isLedgerDerivation, PortfolioType } from '@safely/core';

import type { PortfolioSuggestion } from '../types';

export interface ActivePortfolioEntity {
    portfolioId: IPortfolioId;
    derivation?: IDerivation;
}

export function mapPortfolioToSuggestions(
    portfolio: Portfolio,
    active: ActivePortfolioEntity | undefined,
    derivationName: (index: number) => string,
    blockchain: BLOCKCHAIN_NAME = BLOCKCHAIN_NAME.BTC
): PortfolioSuggestion[] {
    const isActivePortfolio = !!active && portfolio.id.isEq(active.portfolioId);
    const addressOf = (derivation: IDerivation): string | undefined =>
        blockchain === BLOCKCHAIN_NAME.FLAME
            ? derivation.chains.flame?.wallet.address
            : derivation.chains.btc.wallets[0]?.address;

    if (portfolio.type === PortfolioType.WATCH_ONLY) {
        if (isActivePortfolio || blockchain !== BLOCKCHAIN_NAME.BTC) return [];

        return [
            {
                id: portfolio.id.toString(),
                address: portfolio.wallet.address,
                meta: portfolio.meta,
                isWatchOnly: true
            }
        ];
    }

    const derivations = portfolio.getDerivations();
    const isLedger = portfolio.type === PortfolioType.LEDGER;
    const isPerDerivation = isLedger || derivations.length > 1;

    return derivations
        .filter(d => !(isActivePortfolio && active?.derivation && d.id.isEq(active.derivation.id)))
        .filter(derivation => addressOf(derivation) !== undefined)
        .map(derivation => ({
            id: derivation.id.toString(),
            address: addressOf(derivation)!,
            meta: isPerDerivation
                ? {
                      name: isLedgerDerivation(derivation)
                          ? derivation.meta.name
                          : derivationName(derivation.index + 1),
                      icon: portfolio.meta.icon
                  }
                : portfolio.meta,
            tag: isPerDerivation ? derivation.index + 1 : undefined
        }));
}
