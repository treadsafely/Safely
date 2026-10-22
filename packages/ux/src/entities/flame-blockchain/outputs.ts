import { skipToken } from '@tanstack/react-query';

import type {
    FlameApiScanEntry,
    FlameOutputAmount,
    FlameWallet,
    RatedCryptoAssetAmount
} from '@safely/core';
import { FLAME_ASSET, FlameOutputs, Rate, toBig, toFlameOutputBytes } from '@safely/core';

import type { DerivedQueryResult } from '../../shared';
import {
    QUERIES_REFETCH_INTERVAL,
    useDerivedQuery,
    useFlameApi,
    usePersistQuery
} from '../../shared';
import { useActiveFiat } from '../fiat';
import { useActiveFlameWallet } from '../portfolio';
import { flameBlockchain } from './keys';
import { releaseSettledFlameSpends } from './pending-spends';

type FlameWalletScan = {
    entries: FlameApiScanEntry[];
    amounts: Record<string, FlameOutputAmount>;
};

const toFlameOutputs = (scan: FlameWalletScan | null): FlameOutputs | null =>
    scan && FlameOutputs.fromScan(scan.entries, new Map(Object.entries(scan.amounts)));

export function useFlameWalletOutputs(flameWallet: FlameWallet | null) {
    const api = useFlameApi(flameWallet?.network);

    return usePersistQuery<FlameWalletScan | null, unknown, FlameOutputs | null>({
        queryKey: flameBlockchain
            .outputs({ walletId: flameWallet?.id.toString() ?? null, apiId: api?.id ?? null })
            .toKey(),
        queryFn:
            flameWallet && api
                ? async () => {
                      const { outputs } = await api.scan([flameWallet.predicate]);
                      const amounts = await flameWallet.readAmounts(
                          outputs.map(toFlameOutputBytes)
                      );
                      releaseSettledFlameSpends(
                          flameWallet.id.toString(),
                          new Set(outputs.filter(entry => !entry.spent).map(entry => entry.id))
                      );

                      return { entries: outputs, amounts: Object.fromEntries(amounts) };
                  }
                : skipToken,
        // Without a wallet or a node there is nothing to scan: settle as `null`, not as pending
        initialData: flameWallet && api ? undefined : null,
        select: toFlameOutputs,
        schemaKey: 'sFlameWalletScan',
        refetchInterval: QUERIES_REFETCH_INTERVAL.UTXO
    });
}

export function useFlameBalance(flameWallet: FlameWallet | null) {
    const outputsQuery = useFlameWalletOutputs(flameWallet);

    return useDerivedQuery({
        queries: [outputsQuery],
        queryFn: ([data]) => data?.balance ?? null
    });
}

export function useActiveFlameBalance() {
    return useFlameBalance(useActiveFlameWallet());
}

export function useFlameHistory(flameWallet: FlameWallet | null) {
    const outputsQuery = useFlameWalletOutputs(flameWallet);

    return useDerivedQuery({
        queries: [outputsQuery],
        queryFn: ([data]) => data?.history ?? []
    });
}

export function useActiveFlameHistory() {
    return useFlameHistory(useActiveFlameWallet());
}

export function useFlameRatedAmount(
    flameWallet: FlameWallet | null
): DerivedQueryResult<RatedCryptoAssetAmount | null> {
    const outputsQuery = useFlameWalletOutputs(flameWallet);
    const fiat = useActiveFiat();

    return useDerivedQuery({
        queries: [outputsQuery],
        queryFn: ([data]): RatedCryptoAssetAmount | null =>
            data && {
                // TODO: expose `outputs.hasUnreadableUnspent` — unreadable unspent outputs are silently left out of the balance
                amount: data.balance,
                price: new Rate(FLAME_ASSET, fiat, toBig(0))
            }
    });
}

export function useActiveFlameRatedAmount() {
    return useFlameRatedAmount(useActiveFlameWallet());
}
