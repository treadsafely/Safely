import z from 'zod';

import { zIndexedArray, zIndexedObject } from '@safely/slottree';

import { sDerivation } from './derivation.schema';
import {
    portfolioBip39IdToString,
    sPortfolioBip39Id,
    sPortfolioLedger,
    type SPortfolioLedger,
    sPortfolioMeta,
    sPortfolioSecretRevealedStatus,
    sPortfolioType,
    sPortfolioWatchOnly
} from '../../v5';

export const sPortfolioBip39 = zIndexedObject(
    {
        type: z.literal(sPortfolioType.enum.BIP39),
        id: sPortfolioBip39Id,
        meta: sPortfolioMeta,
        secretRevealedStatus: sPortfolioSecretRevealedStatus,
        encryptedSecret: z.string(),
        derivations: z.array(sDerivation)
    },
    value => portfolioBip39IdToString(value.id)
);

export const sPortfolio = z.discriminatedUnion('type', [
    sPortfolioBip39,
    sPortfolioLedger,
    sPortfolioWatchOnly
]);

export const sPortfolios = zIndexedArray(sPortfolio);

export type SPortfolioBip39 = z.infer<typeof sPortfolioBip39>;
export type SPortfolio = z.infer<typeof sPortfolio>;
export type SPortfolios = z.infer<typeof sPortfolios>;

export const isDerivableSPortfolio = (
    portfolio: SPortfolio
): portfolio is SPortfolioBip39 | SPortfolioLedger =>
    portfolio.type !== sPortfolioType.enum.WATCH_ONLY;

export const isBip39SPortfolio = (portfolio: SPortfolio): portfolio is SPortfolioBip39 =>
    portfolio.type === sPortfolioType.enum.BIP39;

export const isLedgerSPortfolio = (portfolio: SPortfolio): portfolio is SPortfolioLedger =>
    portfolio.type === sPortfolioType.enum.LEDGER;
