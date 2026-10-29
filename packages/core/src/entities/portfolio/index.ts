export * from './I-portfolio';
export * from './portfolio-id-bip39';
export * from './portfolio-id-watch-only';
export * from './portfolio-id-ledger';
export * from './portfolio-id-flame-devnet';
export * from './portfolio-bip39';
export * from './portfolio-watch-only-base';
export * from './portfolio-watch-only';
export * from './portfolio-ledger';
export * from './portfolio-flame-devnet';
export * from './portfolio-factory';
export * from './portfolio-meta';
export * from './portfolio-network-type';
export * from './portfolio-id';

import type { PortfolioBip39 } from './portfolio-bip39';
import type { PortfolioFlameDevnet } from './portfolio-flame-devnet';
import type { PortfolioLedger } from './portfolio-ledger';
import type { PortfolioWatchOnly } from './portfolio-watch-only';

export type Portfolio =
    PortfolioBip39 | PortfolioWatchOnly | PortfolioLedger | PortfolioFlameDevnet;
