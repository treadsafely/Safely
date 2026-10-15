import type { Logger } from '@safely/sync';

import { FlameInsufficientBalanceError } from './errors';
import type { FlameOutput, FlameOutputs } from './flame-outputs';
import { FlameTransactionTemplate } from './flame-transaction-template';
import type { FlameEstimation, FlameSendRequest } from './types';
import type { FlameApi } from '../../api/flame';
import { FlameAssetAmount } from '../../entities/asset/exact-crypto-assets-amounts';
import type { IDerivationChainItemFlame } from '../../entities/derivation';
import type { IIdentifiable } from '../../utils';

// Flame has no fee market yet: the node's default floor is 0, and its own tests pay 1000 sparks
export const FLAME_TRANSFER_FEE = 1_000n;

const qtyOf = (output: FlameOutput): bigint =>
    output.amount.status === 'counted' ? output.amount.qty : 0n;

export class FlameEstimator implements IIdentifiable {
    public readonly id: string;

    private readonly logger?: Logger;

    constructor(
        private readonly api: FlameApi,
        private readonly chain: IDerivationChainItemFlame,
        logger?: Logger
    ) {
        this.id = `${this.constructor.name}:${this.api.id}:${this.chain.id.toString()}`;
        this.logger = logger?.child('FlameEstimator');
    }

    public getMaxSendValue(
        outputs: FlameOutputs,
        excludedIds: ReadonlySet<string>
    ): FlameAssetAmount {
        const total = this.spendable(outputs, excludedIds).reduce((acc, o) => acc + qtyOf(o), 0n);
        const max = total - FLAME_TRANSFER_FEE;
        return FlameAssetAmount.fromWeiAmount(max > 0n ? max : 0n);
    }

    public estimate(
        request: FlameSendRequest,
        outputs: FlameOutputs,
        excludedIds: ReadonlySet<string>
    ): FlameTransactionTemplate {
        const spendable = this.spendable(outputs, excludedIds);
        const amount = request.isMax
            ? this.getMaxSendValue(outputs, excludedIds).weiAmount
            : request.amount;
        if (amount <= 0n) {
            throw new FlameInsufficientBalanceError();
        }

        const inputs = request.isMax ? spendable : this.selectInputs(spendable, amount);
        const total = inputs.reduce((acc, o) => acc + qtyOf(o), 0n);
        if (total < amount + FLAME_TRANSFER_FEE) {
            throw new FlameInsufficientBalanceError();
        }

        const estimation: FlameEstimation = {
            fee: { type: 'crypto', amount: FlameAssetAmount.fromWeiAmount(FLAME_TRANSFER_FEE) }
        };

        return new FlameTransactionTemplate(
            this.api,
            this.chain,
            {
                recipientAddress: request.recipientAddress,
                amount: FlameAssetAmount.fromWeiAmount(amount),
                memo: request.memo,
                change: total - amount - FLAME_TRANSFER_FEE
            },
            inputs,
            estimation,
            this.logger
        );
    }

    private spendable(outputs: FlameOutputs, excludedIds: ReadonlySet<string>): FlameOutput[] {
        return outputs.spendable
            .filter(output => !excludedIds.has(output.id))
            .sort((a, b) => (qtyOf(b) > qtyOf(a) ? 1 : qtyOf(b) < qtyOf(a) ? -1 : 0));
    }

    private selectInputs(spendable: FlameOutput[], amount: bigint): FlameOutput[] {
        const selected: FlameOutput[] = [];
        let total = 0n;
        for (const output of spendable) {
            if (total >= amount + FLAME_TRANSFER_FEE) break;
            selected.push(output);
            total += qtyOf(output);
        }
        return selected;
    }
}
