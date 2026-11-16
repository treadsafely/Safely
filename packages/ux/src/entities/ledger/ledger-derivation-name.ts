import type { TranslateFn } from '../../shared';

export const getLedgerDerivationName = (t: TranslateFn, index: number): string =>
    t('portfolio.ledgerWallet', { number: index + 1 });
