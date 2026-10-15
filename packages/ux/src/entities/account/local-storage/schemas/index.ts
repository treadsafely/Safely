import { sActivePortfolioSchema } from './active-portfolio.schema';
import { sFlameSentMemosSchema } from './flame-sent-memos.schema';

export * from './active-portfolio.schema';
export * from './flame-sent-memos.schema';

export const accountLocalStorageStructure = {
    activePortfolio: sActivePortfolioSchema,
    flameSentMemos: sFlameSentMemosSchema
} as const;

export type AccountLocalStorageStructure = typeof accountLocalStorageStructure;
