import { patch } from '@safely/slottree';

import { sPortfolios, type SPortfolios } from './schemas';
import { syncedStorageV6 } from '../v6/structure';

const syncedStorageSchema = syncedStorageV6.schema.extend({
    portfolios: sPortfolios
});

export const syncedStorageV7 = {
    version: 7,
    schema: syncedStorageSchema,
    initial: {
        ...syncedStorageV6.initial,
        portfolios: [] as SPortfolios
    },
    projectUp: patch(syncedStorageV6.schema, syncedStorageSchema, draft =>
        draft.updateEach(['portfolios'], portfolio =>
            portfolio.when(['type'], 'BIP39', bip39 =>
                bip39.updateEach(['derivations'], derivation =>
                    derivation.newField(['chains'], 'flame', null)
                )
            )
        )
    ),
    projectDown: patch(syncedStorageSchema, syncedStorageV6.schema, draft =>
        draft.updateEach(['portfolios'], portfolio =>
            portfolio.when(['type'], 'BIP39', bip39 =>
                bip39.updateEach(['derivations'], derivation =>
                    derivation.deleteField(['chains'], 'flame')
                )
            )
        )
    )
} as const;
