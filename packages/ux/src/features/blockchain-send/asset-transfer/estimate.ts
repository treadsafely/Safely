import { keepPreviousData, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type {
    BtcEstimator,
    BtcTransactionTemplate,
    CryptoAssetAmount,
    FlameTransactionTemplate,
    RatedCryptoAssetAmount,
    Recipient,
    BtcApiUtxo
} from '@safely/core';
import {
    BLOCKCHAIN_NAME,
    BTC_ASSET,
    BtcAssetAmount,
    BtcFeeType,
    OutputsAreSpendingMoreThanInputsError
} from '@safely/core';

import {
    defineQueryKeys,
    finalKey,
    mappedParams,
    QUERIES_REFETCH_INTERVAL,
    QUERIES_STALE_TIME
} from '../../../shared';
import type { SendFormResult } from '../../forms/send/types';
import type { BtcSendChain, FlameSendChain } from '../send-chains';
import { useSendChains } from '../send-chains';

export const btcEstimationKey = defineQueryKeys('btcEstimation', {
    form(__: SendFormResult) {
        return {
            params: mappedParams(
                (_: { estimatorId: string | null; utxos: BtcApiUtxo[] | undefined }) => finalKey,
                p => [p.estimatorId, JSON.stringify(p.utxos)]
            )
        };
    }
});

export const flameEstimationKey = defineQueryKeys('flameEstimation', {
    form(__: SendFormResult) {
        return {
            params: mappedParams(
                (_: { estimatorId: string | null; outputIds: string[] | undefined }) => finalKey,
                p => [p.estimatorId, JSON.stringify(p.outputIds)]
            )
        };
    }
});

export const btcMaxSendKey = defineQueryKeys('btcMaxSend', {
    form(__: Pick<SendFormResult, 'blockchain' | 'recipient'> | undefined) {
        return {
            params: mappedParams(
                (_: {
                    btcEstimator: BtcEstimator;
                    assets: RatedCryptoAssetAmount[] | undefined;
                    utxos: BtcApiUtxo[] | undefined;
                }) => finalKey,
                p => [p.btcEstimator.id, JSON.stringify(p.assets), JSON.stringify(p.utxos)]
            )
        };
    }
});

export const flameMaxSendKey = defineQueryKeys('flameMaxSend', {
    params: mappedParams(
        (_: { estimatorId: string; outputIds: string[] }) => finalKey,
        p => [p.estimatorId, JSON.stringify(p.outputIds)]
    )
});

export function useEstimateAssetTransfer(form: SendFormResult, options?: { enabled?: boolean }) {
    const { btc, flame } = useSendChains();
    const enabled = options?.enabled !== false;
    const btcQuery = useEstimateBtcTransfer(form, btc, enabled);
    const flameQuery = useEstimateFlameTransfer(form, flame, enabled);
    const queryByChain = { [BLOCKCHAIN_NAME.BTC]: btcQuery, [BLOCKCHAIN_NAME.FLAME]: flameQuery };

    return queryByChain[form.blockchain];
}

function useEstimateBtcTransfer(form: SendFormResult, btc: BtcSendChain | null, enabled: boolean) {
    const utxos = btc?.utxos;

    return useQuery<BtcTransactionTemplate>({
        queryKey: btcEstimationKey
            .form(form)
            .params({ estimatorId: btc?.estimator.id ?? null, utxos })
            .toKey(),
        queryFn:
            btc && utxos !== undefined && enabled && form.blockchain === BLOCKCHAIN_NAME.BTC
                ? async () => {
                      const recipientAddress = form.recipient.address;
                      const feeType = BtcFeeType.FAST;

                      try {
                          return await btc.estimator.estimate(
                              form.isMax
                                  ? {
                                        type: 'max',
                                        recipientAddress,
                                        estimatedAmount: form.amount.cryptoAssetAmount,
                                        feeType
                                    }
                                  : {
                                        type: 'not-max',
                                        recipientAddress,
                                        feeType,
                                        amount: form.amount.cryptoAssetAmount
                                    },
                              utxos
                          );
                      } catch (error) {
                          if (
                              error instanceof Error &&
                              error.message.includes('Outputs are spending more than Inputs')
                          ) {
                              throw new OutputsAreSpendingMoreThanInputsError();
                          }
                          throw error;
                      }
                  }
                : skipToken,
        refetchInterval: QUERIES_REFETCH_INTERVAL.TRANSACTION,
        refetchOnMount: 'always',
        placeholderData: keepPreviousData,
        retry: 2
    });
}

function useEstimateFlameTransfer(
    form: SendFormResult,
    flame: FlameSendChain | null,
    enabled: boolean
) {
    const flameEstimator = flame?.estimator;
    const flameOutputs = flame?.outputs;
    return useQuery<FlameTransactionTemplate>({
        queryKey: flameEstimationKey
            .form(form)
            .params({
                estimatorId: flameEstimator?.id ?? null,
                outputIds: flameOutputs?.spendable.map(output => output.id)
            })
            .toKey(),
        queryFn:
            flame &&
            flameEstimator &&
            flameOutputs &&
            enabled &&
            form.blockchain === BLOCKCHAIN_NAME.FLAME
                ? () =>
                      flameEstimator.estimate(
                          {
                              recipientAddress: form.recipient.address,
                              amount: form.amount.cryptoAssetAmount.weiAmount,
                              isMax: form.isMax,
                              memo: form.memo
                          },
                          flameOutputs
                      )
                : skipToken,
        refetchOnMount: 'always',
        placeholderData: keepPreviousData,
        retry: false
    });
}

async function computeBtcMaxSendValue(params: {
    form: Pick<SendFormResult, 'blockchain' | 'recipient'>;
    btcEstimator: BtcEstimator;
    assets: RatedCryptoAssetAmount[];
    utxos: BtcApiUtxo[];
}): Promise<BtcAssetAmount> {
    const { form, btcEstimator, assets, utxos } = params;

    const fee = await btcEstimator.getSendFee(
        { recipientAddress: form.recipient.address, feeType: BtcFeeType.FAST },
        utxos
    );

    const btcBalance = assets.find(a => a.amount.asset.id.isEq(BTC_ASSET.id));
    if (!btcBalance) throw new Error('BTC asset not found');

    if (btcBalance.amount.lte(fee)) return BtcAssetAmount.fromWeiAmount('0');

    return BtcAssetAmount.fromWeiAmount(btcBalance.amount.amountSub(fee).weiAmount);
}

export function useFetchMaxValue(): (
    recipient: Recipient
) => Promise<CryptoAssetAmount | undefined> {
    const queryClient = useQueryClient();
    const { btc, flame } = useSendChains();

    return useCallback(
        async (recipient: Recipient): Promise<CryptoAssetAmount | undefined> => {
            switch (recipient.blockchain) {
                case BLOCKCHAIN_NAME.BTC: {
                    if (!btc?.utxos || !btc.ratedAsset) return undefined;

                    const form = { blockchain: recipient.blockchain, recipient };
                    const assets = [btc.ratedAsset];
                    const { estimator: btcEstimator, utxos } = btc;

                    return queryClient.fetchQuery({
                        queryKey: btcMaxSendKey
                            .form(form)
                            .params({ btcEstimator, assets, utxos })
                            .toKey(),
                        queryFn: () =>
                            computeBtcMaxSendValue({ form, btcEstimator, assets, utxos }),
                        staleTime: QUERIES_STALE_TIME.MAX_SEND
                    });
                }
                case BLOCKCHAIN_NAME.FLAME: {
                    const flameEstimator = flame?.estimator;
                    const outputs = flame?.outputs;
                    if (!flameEstimator || !outputs) return undefined;

                    return queryClient.fetchQuery({
                        queryKey: flameMaxSendKey
                            .params({
                                estimatorId: flameEstimator.id,
                                outputIds: outputs.spendable.map(output => output.id)
                            })
                            .toKey(),
                        queryFn: () => flameEstimator.getMaxSendValue(outputs),
                        staleTime: QUERIES_STALE_TIME.MAX_SEND
                    });
                }
                default:
                    return undefined;
            }
        },
        [queryClient, btc, flame]
    );
}
