import { patch } from '@safely/slottree';

import { sPortfolios, type SPortfolios } from './schemas';
import { syncedStorageV5 } from '../v5/structure';

const syncedStorageSchema = syncedStorageV5.schema.extend({
    portfolios: sPortfolios
});

export const syncedStorageV6 = {
    version: 6,
    schema: syncedStorageSchema,
    initial: {
        ...syncedStorageV5.initial,
        portfolios: [] as SPortfolios
    },
    projectUp: patch(syncedStorageV5.schema, syncedStorageSchema, draft =>
        draft.updateEach(['portfolios'], portfolio =>
            portfolio.when(['type'], 'BIP39', bip39 =>
                bip39.updateEach(['derivations'], derivation =>
                    derivation.newField(['chains'], 'flame', null)
                )
            )
        )
    ),
    projectDown: patch(syncedStorageSchema, syncedStorageV5.schema, draft =>
        draft.updateEach(['portfolios'], portfolio =>
            portfolio.when(['type'], 'BIP39', bip39 =>
                bip39.updateEach(['derivations'], derivation =>
                    derivation.deleteField(['chains'], 'flame')
                )
            )
        )
    )
} as const;
