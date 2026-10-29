import type { BtcApi, BtcWallet } from '@safely/core';

import { defineQueryKeys, finalKey, mappedParams } from '../../shared';

export const btcBlockchain = defineQueryKeys('btc-blockchain', {
    blockNumber: mappedParams(
        (_: BtcApi) => {
            return finalKey;
        },
        api => [api.id]
    )
});

export const utxo = defineQueryKeys('utxo', {
    none: finalKey,
    wallet: mappedParams(
        (__: BtcWallet) => ({
            params: mappedParams(
                (_: { api: BtcApi }) => finalKey,
                ({ api }) => [api.id]
            )
        }),
        wallet => [wallet.id]
    )
});

export const confirmedBalance = defineQueryKeys('btc-confirmed-balance', {
    wallet: mappedParams(
        (_: { wallet: BtcWallet; api: BtcApi }) => finalKey,
        ({ wallet, api }) => [wallet.id, api.id]
    )
});
