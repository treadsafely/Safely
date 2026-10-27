import type { Logger } from '@safely/sync';

import { FlameInsufficientBalanceError } from './errors';
import type { FlameOutput, FlameOutputs } from './flame-outputs';
import { FlameTransactionTemplate } from './flame-transaction-template';
import type { FlameEstimation, FlameSendRequest } from './types';
import type { FlameApi } from '../../api/flame';
import { FlameAssetAmount } from '../../entities/asset/exact-crypto-assets-amounts';
import type { FlameWallet } from '../../entities/derivation';
import type { IIdentifiable } from '../../utils';

// Flame has no fee market yet: the node's default floor is 0, and its own tests pay 1000 sparks
export const FLAME_TRANSFER_FEE = 1_000n;

const qtyOf = (output: FlameOutput): bigint =>
    output.amount.status === 'counted' ? output.amount.qty : 0n;

function byQtyDescending(a: FlameOutput, b: FlameOutput): number {
    const diff = qtyOf(b) - qtyOf(a);

    return Number(diff > 0n) - Number(diff < 0n);
}

export class FlameEstimator implements IIdentifiable {
    public readonly id: string;

    private readonly logger?: Logger;

    constructor(
        private readonly api: FlameApi,
        private readonly wallet: FlameWallet,
        logger?: Logger
    ) {
        this.id = `FlameEstimator:${this.api.id}:${this.wallet.id.toString()}`;
        this.logger = logger?.child('FlameEstimator');
    }

    public getMaxSendValue(outputs: FlameOutputs): FlameAssetAmount {
        const total = this.spendable(outputs).reduce((acc, o) => acc + qtyOf(o), 0n);
        const max = total - FLAME_TRANSFER_FEE;
        return FlameAssetAmount.fromWeiAmount(max > 0n ? max : 0n);
    }

    public estimate(request: FlameSendRequest, outputs: FlameOutputs): FlameTransactionTemplate {
        const spendable = this.spendable(outputs);
        const amount = request.isMax ? this.getMaxSendValue(outputs).weiAmount : request.amount;
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
            this.wallet,
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

    private spendable(outputs: FlameOutputs): FlameOutput[] {
        return [...outputs.spendable].sort(byQtyDescending);
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
