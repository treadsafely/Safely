import { patch, projectIdentity, type DeepReadonly } from '@safely/slottree';

import { sPortfolios, type SPortfolio, type SPortfolioFlameDevnet } from './schemas';
import { syncedStorageV6 } from '../v6/structure';

const syncedStorageSchema = syncedStorageV6.schema.extend({
    portfolios: sPortfolios
});

/* v6 has no devnet portfolio, and a Flame-only wallet has no BTC chain to map it onto */
function isFlameDevnetPortfolio(
    portfolio: DeepReadonly<SPortfolio>
): portfolio is DeepReadonly<SPortfolioFlameDevnet> {
    return portfolio.type === 'FLAME_DEVNET';
}

export const syncedStorageV7 = {
    version: 7,
    schema: syncedStorageSchema,
    initial: { ...syncedStorageV6.initial },
    projectUp: projectIdentity,
    projectDown: patch(syncedStorageSchema, syncedStorageV6.schema, draft =>
        draft.deleteEach(['portfolios'], isFlameDevnetPortfolio)
    )
} as const;
