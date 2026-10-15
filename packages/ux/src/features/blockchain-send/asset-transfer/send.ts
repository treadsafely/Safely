import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TransactionTemplate } from '@safely/core';
import { BtcTransactionTemplate, FlameTransactionTemplate } from '@safely/core';

import {
    addFlamePendingSpends,
    BroadcastedBtcTx,
    flameBlockchain,
    useActiveFlameSource,
    useBtcSendLocked,
    useSaveFlameSentMemo,
    useSetLastBroadcastedBtcTx
} from '../../../entities';
import { useAppContext } from '../../../shared';

export function useSendAssetTransfer() {
    const { mutateAsync: setLastBroadcastedBtcTx } = useSetLastBroadcastedBtcTx();
    const isLocked = useBtcSendLocked();
    const flameSource = useActiveFlameSource();
    const queryClient = useQueryClient();
    const saveFlameSentMemo = useSaveFlameSentMemo();
    const { logger } = useAppContext();

    return useMutation({
        async mutationFn(transactionTemplate: TransactionTemplate | undefined) {
            if (!transactionTemplate) {
                throw new Error('Estimation not found');
            }

            if (isLocked && transactionTemplate instanceof BtcTransactionTemplate) {
                throw new Error('Cannot send while broadcasted transaction cache exists');
            }

            return transactionTemplate.send();
        },
        async onSuccess(result, transactionTemplate) {
            if (transactionTemplate instanceof BtcTransactionTemplate) {
                await setLastBroadcastedBtcTx(
                    BroadcastedBtcTx.fromTransactionTemplate(transactionTemplate)
                );
            }

            if (transactionTemplate instanceof FlameTransactionTemplate && flameSource) {
                addFlamePendingSpends(
                    flameSource.chain.id.toString(),
                    transactionTemplate.spentOutputIds
                );
                void queryClient.invalidateQueries({ queryKey: flameBlockchain.toKey() });

                if (transactionTemplate.request.memo) {
                    // The transfer is already out: a failed save must not fail the send
                    saveFlameSentMemo(result.txId, transactionTemplate.request.memo).catch(
                        (error: unknown) =>
                            logger.error('failed to save the sent Flame memo', error)
                    );
                }
            }
        }
    });
}
