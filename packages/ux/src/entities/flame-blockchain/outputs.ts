import { skipToken } from '@tanstack/react-query';

import type { FlameApiUnspentEntry, FlameOutputAmount, FlameWallet } from '@safely/core';
import { FlameOutputs, toFlameOutputBytes } from '@safely/core';

import { flameBlockchain } from './keys';
import { QUERIES_REFETCH_INTERVAL, useFlameApi, usePersistQuery } from '../../shared';

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
