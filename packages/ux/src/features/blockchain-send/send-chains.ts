import { useMemo } from 'react';

import type {
    BtcApiUtxo,
    BtcEstimator,
    CryptoAssetAmount,
    FlameEstimator,
    FlameOutputs,
    FlameWallet,
    RatedCryptoAssetAmount,
    Recipient,
    SignableBtcWallet
} from '@safely/core';
import { BLOCKCHAIN_NAME, assertUnreachable } from '@safely/core';

import {
    isDerivableEntities,
    useActivePortfolioWallets,
    useActivePortfolioEntities,
    useBtcRatedAmount,
    useBtcWalletUtxo,
    useFlameRatedAmount,
    useFlameWalletOutputs
} from '../../entities';
import { useBtcEstimator } from './btc/estimator';
import { useFlameEstimator } from './flame/estimator';

export type BtcSendChain = {
    wallet: SignableBtcWallet;
    address: string;
    estimator: BtcEstimator;
    utxos: BtcApiUtxo[] | undefined;
    ratedAsset: RatedCryptoAssetAmount | undefined;
    pendingBalance: CryptoAssetAmount | undefined;
    isLocked: boolean;
};

export type FlameSendChain = {
    wallet: FlameWallet;
    address: string;
    estimator: FlameEstimator | null;
    outputs: FlameOutputs | undefined;
    ratedAsset: RatedCryptoAssetAmount | undefined;
};

export type SendChains = {
    btc: BtcSendChain | null;
    flame: FlameSendChain | null;
};

function useBtcSendChain(): BtcSendChain | null {
    const entities = useActivePortfolioEntities();
    const wallet = isDerivableEntities(entities) ? entities.btcWallet : null;

    const estimator = useBtcEstimator(wallet);
    const walletUtxos = useBtcWalletUtxo(wallet).data;
    const ratedAsset = useBtcRatedAmount(wallet).data ?? undefined;

    return useMemo(
        () =>
            wallet &&
            estimator && {
                wallet,
                address: wallet.address,
                estimator,
                utxos: walletUtxos?.confirmed.utxos.concat(walletUtxos.unconfirmedSafe.utxos),
                ratedAsset,
                pendingBalance: walletUtxos?.unconfirmedUnsafe.totalAmount,
                isLocked: walletUtxos?.hasLocalNotBroadcastedCache === true
            },
        [wallet, estimator, walletUtxos, ratedAsset]
    );
}

function useFlameSendChain(): FlameSendChain | null {
    const wallet = useActivePortfolioWallets().flame;

    const estimator = useFlameEstimator(wallet);
    const outputs = useFlameWalletOutputs(wallet).data ?? undefined;
    const ratedAsset = useFlameRatedAmount(wallet).data ?? undefined;

    return useMemo(
        () =>
            wallet && { wallet, address: wallet.receivingAddress, estimator, outputs, ratedAsset },
        [wallet, estimator, outputs, ratedAsset]
    );
}

export function selectSendChain(
    chains: SendChains,
    blockchain: Recipient['blockchain']
): BtcSendChain | FlameSendChain | null {
    switch (blockchain) {
        case BLOCKCHAIN_NAME.BTC:
            return chains.btc;
        case BLOCKCHAIN_NAME.FLAME:
            return chains.flame;
        default:
            return assertUnreachable(blockchain);
    }
}

export function useSendChains(): SendChains {
    const btc = useBtcSendChain();
    const flame = useFlameSendChain();

    return useMemo(() => ({ btc, flame }), [btc, flame]);
}
