import { defineQueryKeys, finalKey, mappedParams } from '../../shared';

export const flameBlockchain = defineQueryKeys('flame-blockchain', {
    outputs: mappedParams(
        (_: { walletId: string | null; apiId: string | null }) => finalKey,
        ({ walletId, apiId }) => [walletId, apiId]
    )
});
