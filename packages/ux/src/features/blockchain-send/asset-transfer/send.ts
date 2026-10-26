import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TransactionTemplate } from '@safely/core';
import { BtcTransactionTemplate, FlameTransactionTemplate } from '@safely/core';

import { BroadcastedBtcTx, flameBlockchain, useSetLastBroadcastedBtcTx } from '../../../entities';
import { useSendChains } from '../send-chains';

export function useSendAssetTransfer() {
    const { btc } = useSendChains();
    const { mutateAsync: setLastBroadcastedBtcTx } = useSetLastBroadcastedBtcTx();
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(transactionTemplate: TransactionTemplate | undefined) {
            if (!transactionTemplate) {
                throw new Error('Estimation not found');
            }

            if (transactionTemplate instanceof BtcTransactionTemplate && btc?.isLocked) {
                throw new Error('Cannot send while broadcasted transaction cache exists');
            }

            return transactionTemplate.send();
        },
        async onSuccess(_result, transactionTemplate) {
            if (transactionTemplate instanceof BtcTransactionTemplate) {
                await setLastBroadcastedBtcTx(
                    BroadcastedBtcTx.fromTransactionTemplate(transactionTemplate)
                );
            }

            if (transactionTemplate instanceof FlameTransactionTemplate) {
                await queryClient.invalidateQueries({ queryKey: flameBlockchain.outputs.toKey() });
            }
        }
    });
}
