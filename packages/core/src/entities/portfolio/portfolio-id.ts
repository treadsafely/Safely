import type { SPortfolio } from '@safely/sync-storage';

import { PortfolioType } from './I-portfolio';
import { toPortfolioIdBip39 } from './portfolio-id-bip39';
import { PortfolioIdFlameDevnet } from './portfolio-id-flame-devnet';
import { toPortfolioIdLedger } from './portfolio-id-ledger';
import { toPortfolioIdWatchOnly } from './portfolio-id-watch-only';
import { assertUnreachable } from '../../utils';

export function toPortfolioId(portfolio: SPortfolio) {
    switch (portfolio.type) {
        case PortfolioType.BIP39:
            return toPortfolioIdBip39(portfolio.id);
        case PortfolioType.LEDGER:
            return toPortfolioIdLedger(portfolio.id);
        case PortfolioType.WATCH_ONLY:
            return toPortfolioIdWatchOnly(portfolio.id);
        case PortfolioType.FLAME_DEVNET:
            return new PortfolioIdFlameDevnet(portfolio.id);
        default:
            assertUnreachable(portfolio);
    }
}
