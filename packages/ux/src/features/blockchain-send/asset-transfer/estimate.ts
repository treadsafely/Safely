import { keepPreviousData, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

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
    useActiveBtcRatedAmount,
    useActiveBtcWalletUtxoForEstimation,
    useActiveFlameSource,
    useFlamePendingSpends,
    useFlameWalletOutputs
} from '../../../entities';
import {
    defineQueryKeys,
    finalKey,
    mappedParams,
    QUERIES_REFETCH_INTERVAL,
    QUERIES_STALE_TIME
} from '../../../shared';
import type { SendFormResult } from '../../forms/send/types';
import { useBtcEstimator } from '../btc/estimator';
import { useFlameEstimator } from '../flame/estimator';

export const estimationKey = defineQueryKeys('estimation', {
    form(__: SendFormResult) {
        return {
            params: mappedParams(
                (_: { btcEstimator: BtcEstimator; utxos: BtcApiUtxo[] | undefined }) => finalKey,
                p => [p.btcEstimator.id, JSON.stringify(p.utxos)]
            )
        };
    }
});

export const flameEstimationKey = defineQueryKeys('flameEstimation', {
    form(__: SendFormResult) {
        return {
            params: mappedParams(
                (_: {
                    estimatorId: string | null;
                    outputIds: string[] | undefined;
                    pendingIds: ReadonlySet<string>;
                }) => finalKey,
                p => [p.estimatorId, JSON.stringify(p.outputIds), JSON.stringify([...p.pendingIds])]
            )
        };
    }
});

export const maxSendKey = defineQueryKeys('maxSendKey', {
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

export function useEstimateAssetTransfer(form: SendFormResult, options?: { enabled?: boolean }) {
    const enabled = options?.enabled !== false;
    const btc = useEstimateBtcTransfer(form, enabled && form.blockchain === BLOCKCHAIN_NAME.BTC);
    const flame = useEstimateFlameTransfer(
        form,
        enabled && form.blockchain === BLOCKCHAIN_NAME.FLAME
    );

    return form.blockchain === BLOCKCHAIN_NAME.FLAME ? flame : btc;
}

function useEstimateFlameTransfer(form: SendFormResult, enabled: boolean) {
    const estimator = useFlameEstimator();
    const { data } = useFlameWalletOutputs(useActiveFlameSource());
    const pendingIds = useFlamePendingSpends(data?.wallet.id.toString());
    const outputs = data?.outputs;

    return useQuery<FlameTransactionTemplate>({
        queryKey: flameEstimationKey
            .form(form)
            .params({
                estimatorId: estimator?.id ?? null,
                outputIds: outputs?.spendable.map(output => output.id),
                pendingIds
            })
            .toKey(),
        queryFn:
            enabled && estimator && outputs
                ? () =>
                      estimator.estimate(
                          {
                              recipientAddress: form.recipient.address,
                              amount: form.amount.cryptoAssetAmount.weiAmount,
                              isMax: form.isMax,
                              memo: form.blockchain === BLOCKCHAIN_NAME.FLAME ? form.memo : ''
                          },
                          outputs,
                          pendingIds
                      )
                : skipToken,
        refetchOnMount: 'always',
        placeholderData: keepPreviousData,
        retry: false
    });
}

function useEstimateBtcTransfer(form: SendFormResult, enabled: boolean) {
    const btcEstimator = useBtcEstimator();
    const { data: utxos } = useActiveBtcWalletUtxoForEstimation();

    return useQuery<BtcTransactionTemplate>({
        queryKey: estimationKey.form(form).params({ btcEstimator, utxos }).toKey(),
        queryFn:
            utxos !== undefined && enabled
                ? async () => {
                      if (form.blockchain === BLOCKCHAIN_NAME.BTC) {
                          const recipientAddress = form.recipient.address;
                          const feeType = BtcFeeType.FAST;

                          try {
                              return await btcEstimator.estimate(
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

                      throw new Error(`BTC estimation for a ${form.blockchain} transfer`);
                  }
                : skipToken,
        refetchInterval: QUERIES_REFETCH_INTERVAL.TRANSACTION,
        refetchOnMount: 'always',
        placeholderData: keepPreviousData,
        retry: 2
    });
}

async function computeMaxSendValue(params: {
    form: Pick<SendFormResult, 'blockchain' | 'recipient'>;
    btcEstimator: BtcEstimator;
    assets: RatedCryptoAssetAmount[];
    utxos: BtcApiUtxo[];
}): Promise<BtcAssetAmount> {
    const { form, btcEstimator, assets, utxos } = params;

    if (form.blockchain === BLOCKCHAIN_NAME.BTC) {
        const fee = await btcEstimator.getSendFee(
            { recipientAddress: form.recipient.address, feeType: BtcFeeType.FAST },
            utxos
        );

        const btcBalance = assets.find(a => a.amount.asset.id.isEq(BTC_ASSET.id));
        if (!btcBalance) throw new Error('BTC asset not found');

        if (btcBalance.amount.lte(fee)) return BtcAssetAmount.fromWeiAmount('0');

        return BtcAssetAmount.fromWeiAmount(btcBalance.amount.amountSub(fee).weiAmount);
    }

    throw new Error(`BTC max value for a ${form.blockchain} transfer`);
}

export function useMaxSendValueQueryConfig() {
    const btcEstimator = useBtcEstimator();
    const { data: btc } = useActiveBtcRatedAmount();
    const assets = useMemo(() => btc && [btc], [btc]);
    const { data: utxos } = useActiveBtcWalletUtxoForEstimation();

    return useCallback(
        (form: Pick<SendFormResult, 'blockchain' | 'recipient'>) => {
            if (!utxos || !assets) return undefined;

            return {
                queryKey: maxSendKey.form(form).params({ btcEstimator, assets, utxos }).toKey(),
                queryFn: () => computeMaxSendValue({ form, btcEstimator, assets, utxos }),
                staleTime: QUERIES_STALE_TIME.MAX_SEND
            };
        },
        [btcEstimator, assets, utxos]
    );
}

export function useFetchMaxValue(): (
    recipient: Recipient
) => Promise<CryptoAssetAmount | undefined> {
    const queryClient = useQueryClient();
    const buildConfig = useMaxSendValueQueryConfig();
    const flameEstimator = useFlameEstimator();
    const { data: flame } = useFlameWalletOutputs(useActiveFlameSource());
    const flamePendingIds = useFlamePendingSpends(flame?.wallet.id.toString());

    return useCallback(
        async (recipient: Recipient): Promise<CryptoAssetAmount | undefined> => {
            if (recipient.blockchain === BLOCKCHAIN_NAME.FLAME) {
                return flameEstimator && flame
                    ? flameEstimator.getMaxSendValue(flame.outputs, flamePendingIds)
                    : undefined;
            }

            const config = buildConfig({ blockchain: recipient.blockchain, recipient });

            return config ? queryClient.fetchQuery(config) : undefined;
        },
        [queryClient, buildConfig, flameEstimator, flame, flamePendingIds]
    );
}
