import z from 'zod';

import { zIndexedArray, zIndexedObject } from '@safely/slottree';

import {
    sPortfolioBip39,
    sPortfolioLedger,
    sPortfolioMeta,
    sPortfolioType as sPortfolioTypeV6,
    sPortfolioWatchOnly,
    type SPortfolioBip39,
    type SPortfolioLedger
} from '../../v6';

export const sPortfolioType = z.enum([...sPortfolioTypeV6.options, 'FLAME_DEVNET']);

export const sFlameAccountChainItem = z.object({
    viewKey: z.string(),
    address: z.string(),
    predicate: z.string()
});

export const sPortfolioFlameDevnetId = z.object({
    mnemonicHash: z.string()
});

export function portfolioFlameDevnetIdToString(id: SPortfolioFlameDevnetId): string {
    return ['portfolio', sPortfolioType.enum.FLAME_DEVNET, id.mnemonicHash].join(':');
}

export const sPortfolioFlameDevnet = zIndexedObject(
    {
        type: z.literal(sPortfolioType.enum.FLAME_DEVNET),
        id: sPortfolioFlameDevnetId,
        meta: sPortfolioMeta,
        encryptedSecret: z.string(),
        flame: sFlameAccountChainItem
    },
    value => portfolioFlameDevnetIdToString(value.id)
);

export const sPortfolio = z.discriminatedUnion('type', [
    sPortfolioBip39,
    sPortfolioLedger,
    sPortfolioWatchOnly,
    sPortfolioFlameDevnet
]);

export const sPortfolios = zIndexedArray(sPortfolio);

export type SFlameAccountChainItem = z.infer<typeof sFlameAccountChainItem>;
export type SPortfolioFlameDevnetId = z.infer<typeof sPortfolioFlameDevnetId>;
export type SPortfolioFlameDevnet = z.infer<typeof sPortfolioFlameDevnet>;
export type SPortfolio = z.infer<typeof sPortfolio>;
export type SPortfolios = z.infer<typeof sPortfolios>;

export const isDerivableSPortfolio = (
    portfolio: SPortfolio
): portfolio is SPortfolioBip39 | SPortfolioLedger =>
    portfolio.type === sPortfolioType.enum.BIP39 || portfolio.type === sPortfolioType.enum.LEDGER;

export const isBip39SPortfolio = (portfolio: SPortfolio): portfolio is SPortfolioBip39 =>
    portfolio.type === sPortfolioType.enum.BIP39;

export const isLedgerSPortfolio = (portfolio: SPortfolio): portfolio is SPortfolioLedger =>
    portfolio.type === sPortfolioType.enum.LEDGER;

export const isFlameDevnetSPortfolio = (
    portfolio: SPortfolio
): portfolio is SPortfolioFlameDevnet => portfolio.type === sPortfolioType.enum.FLAME_DEVNET;
