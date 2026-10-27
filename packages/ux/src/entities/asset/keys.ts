import { defineQueryKeys, finalKey } from '../../shared';

export const assetKeys = defineQueryKeys('assets', {
    all: (_walletId: string | undefined) => ({
        fiat: (_fiatId: string) => finalKey
    }),
    // not `rate`: entries persisted under that key hold a zero rate where null is now expected
    marketRate: (_assetId: string) => ({
        fiat: (_fiatId: string) => ({
            params: (_: { isTestnet: boolean }) => finalKey
        })
    }),
    chart: (_assetId: string) => ({
        fiat: (_fiatId: string) => ({
            startDate: (_startDate: string) => finalKey
        })
    })
});
