import type { IDerivation, IPortfolioId, Portfolio, Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME, isLedgerDerivation, PortfolioType } from '@safely/core';

import { isDerivablePortfolio, resolveFlameWallet } from '../../../../entities';
import type { PortfolioSuggestion } from '../types';

export interface ActivePortfolioEntity {
    portfolioId: IPortfolioId;
    derivation?: IDerivation;
}

export function mapPortfolioToSuggestions(
    portfolio: Portfolio,
    active: ActivePortfolioEntity | undefined,
    derivationName: (index: number) => string,
    blockchain: Recipient['blockchain'] = BLOCKCHAIN_NAME.BTC
): PortfolioSuggestion[] {
    const isActivePortfolio = !!active && portfolio.id.isEq(active.portfolioId);

    if (blockchain === BLOCKCHAIN_NAME.FLAME) {
        const flame = resolveFlameWallet(portfolio);
        if (isActivePortfolio || !flame) return [];

        return [
            { id: portfolio.id.toString(), address: flame.receivingAddress, meta: portfolio.meta }
        ];
    }

    if (portfolio.type === PortfolioType.WATCH_ONLY) {
        if (isActivePortfolio) return [];

        return [
            {
                id: portfolio.id.toString(),
                address: portfolio.wallet.address,
                meta: portfolio.meta,
                isWatchOnly: true
            }
        ];
    }

    if (!isDerivablePortfolio(portfolio)) return [];

    const derivations = portfolio.getDerivations();
    const isLedger = portfolio.type === PortfolioType.LEDGER;
    const isPerDerivation = isLedger || derivations.length > 1;

    return derivations
        .filter(d => !(isActivePortfolio && active?.derivation && d.id.isEq(active.derivation.id)))
        .flatMap(derivation => {
            const btc = derivation.chains.btc.wallets.at(0);
            if (!btc) return [];

            return [
                {
                    id: derivation.id.toString(),
                    address: btc.address,
                    meta: isPerDerivation
                        ? {
                              name: isLedgerDerivation(derivation)
                                  ? derivation.meta.name
                                  : derivationName(derivation.index + 1),
                              icon: portfolio.meta.icon
                          }
                        : portfolio.meta,
                    tag: isPerDerivation ? derivation.index + 1 : undefined
                }
            ];
        });
}
