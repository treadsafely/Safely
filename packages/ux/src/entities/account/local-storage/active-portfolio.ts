import { Id, toPortfolioId } from '@safely/core';
import type { SPortfolio } from '@safely/sync-storage';

import type { SActivePortfolioSchema } from './schemas';

export function resolveActivePortfolio(
    stored: SActivePortfolioSchema,
    portfolios: SPortfolio[]
): SActivePortfolioSchema {
    if (portfolios.length === 0) return null;

    const isStoredValid =
        stored !== null &&
        portfolios.some(p => toPortfolioId(p).isEq(Id.fromString(stored.portfolioId)));

    return isStoredValid ? stored : { portfolioId: toPortfolioId(portfolios[0]).toString() };
}
