import { useQuery } from '@tanstack/react-query';

import type { RatedCryptoAssetAmount } from '@safely/core';
import { FLAME_ASSET, FlameOutputs, Rate, toBig, toFlameOutputBytes } from '@safely/core';

import type { DerivedQueryResult } from '../../shared';
import { QUERIES_REFETCH_INTERVAL, useDerivedQuery, useFlameApi } from '../../shared';
import { useActiveFiat } from '../fiat';
import { flameBlockchain } from './keys';
import type { FlameSource } from './source';
import { useActiveFlameSource } from './source';

export function useFlameWalletOutputs(source: FlameSource | null) {
    const api = useFlameApi(source?.chain.network);
    const enabled = !!source && !!api;

    return useQuery({
        queryKey: flameBlockchain
            .outputs({ walletId: source?.chain.id.toString() ?? null, apiId: api?.id ?? null })
            .toKey(),
        queryFn: async () => {
            if (!source || !api) return null;

            const { wallet } = source.chain;
            const { outputs } = await api.scan([wallet.predicate]);
            const amounts = await source.chain.readAmounts(outputs.map(toFlameOutputBytes));

            return { wallet, outputs: FlameOutputs.fromScan(outputs, amounts) };
        },
        enabled,
        // Without a source or a node there is nothing to scan: settle as `null`, not as pending
        initialData: enabled ? undefined : null,
        refetchInterval: QUERIES_REFETCH_INTERVAL.UTXO
    });
}

export function useFlameBalance(source: FlameSource | null) {
    const outputsQuery = useFlameWalletOutputs(source);

    return useDerivedQuery({
        queries: [outputsQuery],
        queryFn: ([data]) => data?.outputs.balance ?? null
    });
}

export function useActiveFlameBalance() {
    return useFlameBalance(useActiveFlameSource());
}

export function useFlameHistory(source: FlameSource | null) {
    const outputsQuery = useFlameWalletOutputs(source);

    return useDerivedQuery({
        queries: [outputsQuery],
        queryFn: ([data]) => data?.outputs.history ?? []
    });
}

export function useActiveFlameHistory() {
    return useFlameHistory(useActiveFlameSource());
}

export function useFlameRatedAmount(
    source: FlameSource | null
): DerivedQueryResult<RatedCryptoAssetAmount | null> {
    const outputsQuery = useFlameWalletOutputs(source);
    const fiat = useActiveFiat();

    return useDerivedQuery({
        queries: [outputsQuery],
        queryFn: ([data]): RatedCryptoAssetAmount | null =>
            data && {
                // TODO: expose `outputs.hasUnreadableUnspent` — unreadable unspent outputs are silently left out of the balance
                amount: data.outputs.balance,
                price: new Rate(FLAME_ASSET, fiat, toBig(0))
            }
    });
}

export function useActiveFlameRatedAmount() {
    return useFlameRatedAmount(useActiveFlameSource());
}
