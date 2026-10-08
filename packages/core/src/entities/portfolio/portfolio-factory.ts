import type { SPortfolio } from '@safely/sync-storage';

import { PortfolioType } from './I-portfolio';
import { PortfolioBip39 } from './portfolio-bip39';
import { PortfolioLedger } from './portfolio-ledger';
import { PortfolioWatchOnlyBtc } from './portfolio-watch-only';
import type { ISecretEncryptor } from '../../di';
import { assertUnreachable } from '../../utils';
import type { ILedgerSessionPort } from '../signer';

export type PortfolioRestoreDeps = {
    secureEncryptor: ISecretEncryptor;
    ledgerSessionPort: ILedgerSessionPort;
};

export class PortfolioFactory {
    public static restorePortfolio(portfolio: SPortfolio, deps: PortfolioRestoreDeps) {
        switch (portfolio.type) {
            case PortfolioType.BIP39:
                return PortfolioBip39.restore(deps.secureEncryptor, portfolio);
            case PortfolioType.LEDGER:
                return PortfolioLedger.restore(portfolio, deps.ledgerSessionPort);
            case PortfolioType.WATCH_ONLY:
                return PortfolioWatchOnlyBtc.restore(portfolio);
            default:
                assertUnreachable(portfolio);
        }
    }
}
