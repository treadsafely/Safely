import { patch } from '@safely/slottree';

import { sPortfolios, type SPortfolios } from './schemas';
import { syncedStorageV4 } from '../v4/structure';

const syncedStorageSchema = syncedStorageV4.schema.extend({
    portfolios: sPortfolios
});

export const syncedStorageV5 = {
    version: 5,
    schema: syncedStorageSchema,
    initial: {
        ...syncedStorageV4.initial,
        portfolios: [] as SPortfolios
    },
    projectUp: patch(syncedStorageV4.schema, syncedStorageSchema, draft =>
        draft.updateEach(['portfolios'], portfolio =>
            portfolio.when(['type'], 'BIP39', bip39 =>
                bip39.updateEach(['derivations'], derivation =>
                    derivation.newField(['chains'], 'flame', null)
                )
            )
        )
    ),
    projectDown: patch(syncedStorageSchema, syncedStorageV4.schema, draft =>
        draft.updateEach(['portfolios'], portfolio =>
            portfolio.when(['type'], 'BIP39', bip39 =>
                bip39.updateEach(['derivations'], derivation =>
                    derivation.deleteField(['chains'], 'flame')
                )
            )
        )
    )
} as const;
