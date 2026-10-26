import { skipToken } from '@tanstack/react-query';

import type {
    FlameApiUnspentEntry,
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

type FlameWalletUnspent = {
    entries: FlameApiUnspentEntry[];
    amounts: Record<string, FlameOutputAmount>;
};

const toFlameOutputs = (unspent: FlameWalletUnspent | null): FlameOutputs | null =>
    unspent && FlameOutputs.fromUnspent(unspent.entries, new Map(Object.entries(unspent.amounts)));

export function useFlameWalletOutputs(flameWallet: FlameWallet | null) {
    const api = useFlameApi(flameWallet?.network);

    return usePersistQuery<FlameWalletUnspent | null, unknown, FlameOutputs | null>({
        queryKey: flameBlockchain
            .outputs({ walletId: flameWallet?.id.toString() ?? null, apiId: api?.id ?? null })
            .toKey(),
        queryFn:
            flameWallet && api
                ? async () => {
                      const { outputs } = await api.unspent(flameWallet.receivingAddress, true);
                      const amounts = await flameWallet.readAmounts(
                          outputs.map(toFlameOutputBytes)
                      );

                      return { entries: outputs, amounts: Object.fromEntries(amounts) };
                  }
                : skipToken,
        // Without a wallet or a node there is nothing to read: settle as `null`, not as pending
        initialData: flameWallet && api ? undefined : null,
        select: toFlameOutputs,
        schemaKey: 'sFlameWalletUnspent',
        refetchInterval: QUERIES_REFETCH_INTERVAL.UTXO
    });
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
