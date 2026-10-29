import { defineQueryKeys, finalKey, mappedParams } from '../../shared';

export const portfolioKeys = defineQueryKeys('portfolio', {
    all: () => finalKey,
    active: () => finalKey,
    flameDevnetPreview: mappedParams(
        (_: { portfolioId: string }) => finalKey,
        ({ portfolioId }) => [portfolioId]
    )
});
