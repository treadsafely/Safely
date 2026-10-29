import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TransactionTemplate } from '@safely/core';
import { BLOCKCHAIN_NAME, FlameSendStatusUnknownError, assertUnreachable } from '@safely/core';

import { BroadcastedBtcTx, flameBlockchain, useSetLastBroadcastedBtcTx } from '../../../entities';
import type { SendChains } from '../send-chains';
import { useSendChains } from '../send-chains';

function assertCanSend(template: TransactionTemplate, chains: SendChains): void {
    switch (template.blockchain) {
        case BLOCKCHAIN_NAME.BTC:
            if (chains.btc?.isLocked) {
                throw new Error('Cannot send while broadcasted transaction cache exists');
            }
            return;
        case BLOCKCHAIN_NAME.FLAME:
            return;
        default:
            assertUnreachable(template);
    }
}

export function useSendAssetTransfer() {
    const chains = useSendChains();
    const { mutateAsync: setLastBroadcastedBtcTx } = useSetLastBroadcastedBtcTx();
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(transactionTemplate: TransactionTemplate | undefined) {
            if (!transactionTemplate) {
                throw new Error('Estimation not found');
            }

            assertCanSend(transactionTemplate, chains);

            return transactionTemplate.send();
        },
        async onSuccess(_result, transactionTemplate) {
            if (!transactionTemplate) return;

            switch (transactionTemplate.blockchain) {
                case BLOCKCHAIN_NAME.BTC:
                    await setLastBroadcastedBtcTx(
                        BroadcastedBtcTx.fromTransactionTemplate(transactionTemplate)
                    );
                    return;
                case BLOCKCHAIN_NAME.FLAME:
                    await queryClient.invalidateQueries({ queryKey: flameBlockchain.toKey() });
                    return;
                default:
                    assertUnreachable(transactionTemplate);
            }
        },
        async onError(error) {
            if (error instanceof FlameSendStatusUnknownError) {
                await queryClient.invalidateQueries({ queryKey: flameBlockchain.toKey() });
            }
        }
    });
}
