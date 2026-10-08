import { z } from 'zod';

import { zIndexedObject } from '@safely/slottree';

import { sDerivationChains as sDerivationChainsV5 } from '../../v5';

export const sFlameAccountChainItem = z.object({
    viewKey: z.string(),
    address: z.string(),
    predicate: z.string()
});

export const sDerivationChains = sDerivationChainsV5.extend({
    flame: sFlameAccountChainItem.nullable()
});

export const sDerivation = zIndexedObject(
    {
        index: z.number(),
        chains: sDerivationChains
    },
    value => String(value.index)
);

export type SDerivation = z.infer<typeof sDerivation>;
export type SFlameAccountChainItem = z.infer<typeof sFlameAccountChainItem>;
