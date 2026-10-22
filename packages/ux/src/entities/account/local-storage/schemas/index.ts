import { sActivePortfolioSchema } from './active-portfolio.schema';

export * from './active-portfolio.schema';

export const accountLocalStorageStructure = {
    activePortfolio: sActivePortfolioSchema
} as const;

export type AccountLocalStorageStructure = typeof accountLocalStorageStructure;
