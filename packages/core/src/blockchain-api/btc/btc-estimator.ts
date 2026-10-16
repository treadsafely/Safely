import Big from 'big.js';

import type { Logger } from '@safely/sync';

import { BtcAddress } from './btc-address';
import { BtcPsbtBuilder } from './btc-psbt-builder';
import { BtcTransactionTemplate } from './btc-transaction-template';
import { BtcInsufficientFundsForFeeError } from './errors';
import type { BtcTransferRequest, BtcTransferRequestMax, BtcTransferRequestNotMax } from './types';
import { BtcFeeType } from './types';
import { getUtxoTotal } from './utils';
import type { BtcApi, BtcApiEstimatedFee, BtcApiUtxo } from '../../api/btc';
import type { BtcAsset, CryptoAssetAmount, SignableBtcWallet } from '../../entities';
import { BtcAssetAmount } from '../../entities/asset';
import { btcNetworkConfig } from '../../entities/blockchain';
import { OutputsAreSpendingMoreThanInputsError } from '../../entities/errors/outputs-are-spending-more-than-inputs.error';
import type { IIdentifiable } from '../../utils';
import { abs, assertUnreachable, toBig } from '../../utils';

export type SpentUtxo = { txid: string; vout: number; value: string };

// Abort max send if the form-preview amount and the confirmation re-estimate differ
// by more than this. Fixed (not fee-proportional): a manipulated fee can't widen it.
const MAX_ESTIMATE_DRIFT_TOLERANCE_SAT = 10_000n;

function getDustSat(walletAddress: string) {
    const type = BtcAddress.type(walletAddress);
    switch (type) {
        // Bitcoin Core's GetDustThreshold (policy/policy.cpp) for a P2WPKH output at the default
        // dustRelayFee of 3000 sat/kvB: (31 + 67) * 3 = 294 sat. Outputs strictly
        // below this are rejected by the node with reject reason "dust" (-26).
        case 'P2WPKH':
            return 294n;
        default:
            throw new Error('Unsupported address type');
    }
}

export class BtcEstimator implements IIdentifiable {
    public readonly id: string;

    private readonly psbtBuilder: BtcPsbtBuilder;

    private readonly logger?: Logger;

    constructor(
        private readonly btcApi: BtcApi,
        private readonly wallet: SignableBtcWallet,
        logger?: Logger
    ) {
        this.id = `${this.constructor.name}:${this.btcApi.id}:${this.wallet.id.toString()}`;
        this.logger = logger?.child('BtcEstimator');
        this.psbtBuilder = new BtcPsbtBuilder(btcNetworkConfig[this.wallet.network]);
    }

    private async getFeeValue(
        feeType: BtcFeeType
    ): Promise<{ targetBlock: number; feeSatVb: Big }> {
        const feePrice = await this.btcApi.getFeePrice();

        const format = (v: BtcApiEstimatedFee) => ({
            targetBlock: v.target_block,
            feeSatVb: toBig(v.fee)
        });

        switch (feeType) {
            case BtcFeeType.FAST:
                return format(feePrice.fast_send);
            case BtcFeeType.SLOW:
                return format(feePrice.normal_send);
            default:
                assertUnreachable(feeType);
        }
    }

    public async getSendFee(
        request: Omit<BtcTransferRequestMax, 'type' | 'estimatedAmount'>,
        utxo: BtcApiUtxo[]
    ): Promise<BtcAssetAmount> {
        const { fee } = await this.estimateSendFee(request, utxo);
        return fee;
    }

    public async estimate(
        request: BtcTransferRequest,
        utxo: BtcApiUtxo[]
    ): Promise<BtcTransactionTemplate> {
        this.logger?.info('estimating transaction', { request, utxo });
        let result: BtcTransactionTemplate;

        switch (request.type) {
            case 'max':
                result = await this.estimateMax(request, utxo);
                break;
            case 'not-max':
                result = await this.estimateNotMax(request, utxo);
                break;
            default:
                assertUnreachable(request);
        }

        this.logger?.info('transaction estimated', result);
        return result;
    }

    private async estimateNotMax(
        request: BtcTransferRequestNotMax,
        utxos: BtcApiUtxo[]
    ): Promise<BtcTransactionTemplate> {
        if (request.amount.weiAmount <= 0n) {
            throw new Error('Amount must be greater than zero');
        }

        if (!utxos.length) {
            throw new Error('No UTXOs available');
        }

        const totalBalance = getUtxoTotal(utxos);

        if (totalBalance.lt(request.amount)) {
            throw new OutputsAreSpendingMoreThanInputsError('Not enough funds');
        }

        const { feeSatVb, targetBlock } = await this.getFeeValue(request.feeType);

        const vSizeNoChange = this.psbtBuilder.calculateTransactionVSize({
            inputs: utxos,
            outputs: [{ address: request.recipientAddress, value: request.amount.weiAmount }]
        });
        const feeNoChange = BtcAssetAmount.fromWeiAmount(
            feeSatVb.mul(toBig(vSizeNoChange)).round(0, Big.roundUp)
        );

        if (totalBalance.lt(request.amount.add(feeNoChange))) {
            throw new BtcInsufficientFundsForFeeError('Not enough funds to cover the fee');
        }

        const vSizeWithChange = this.psbtBuilder.calculateTransactionVSize({
            inputs: utxos,
            outputs: [
                { address: request.recipientAddress, value: request.amount.weiAmount },
                { address: this.wallet.address, value: 1n }
            ]
        });
        const feeWithChange = BtcAssetAmount.fromWeiAmount(
            feeSatVb.mul(toBig(vSizeWithChange)).round(0, Big.roundUp)
        );

        let fee: CryptoAssetAmount<BtcAsset>;
        let hasChange: boolean;

        const change = totalBalance.weiAmount - request.amount.weiAmount - feeWithChange.weiAmount; // might be negative
        if (change < getDustSat(this.wallet.address)) {
            fee = totalBalance.sub(request.amount);
            hasChange = false;
        } else {
            fee = feeWithChange;
            hasChange = true;
        }

        return new BtcTransactionTemplate(
            this.btcApi,
            this.wallet,
            {
                recipientAddress: request.recipientAddress,
                amount: request.amount,
                hasChange
            },
            utxos,
            {
                fee: { amount: fee, type: 'crypto' },
                feeType: request.feeType,
                txTargetBlock: targetBlock
            },
            this.logger
        );
    }

    private async estimateSendFee(
        request: Omit<BtcTransferRequestMax, 'type' | 'estimatedAmount'>,
        utxos: BtcApiUtxo[]
    ) {
        const { feeSatVb, targetBlock } = await this.getFeeValue(request.feeType);

        if (!utxos.length) {
            throw new Error('No UTXOs available');
        }

        const totalBalance = getUtxoTotal(utxos);

        const vSize = this.psbtBuilder.calculateTransactionVSize({
            inputs: utxos,
            outputs: [{ address: request.recipientAddress, value: 1n }]
        });

        const feeSat = feeSatVb.mul(toBig(vSize)).round(0, Big.roundUp);
        const fee = BtcAssetAmount.fromWeiAmount(feeSat);

        if (totalBalance.lt(fee)) {
            throw new BtcInsufficientFundsForFeeError(
                'Total balance is not enough to cover transaction fee'
            );
        }

        return { fee, targetBlock, utxos };
    }

    private async estimateMax(
        request: BtcTransferRequestMax,
        utxos: BtcApiUtxo[]
    ): Promise<BtcTransactionTemplate> {
        if (request.estimatedAmount.weiAmount <= 0n) {
            throw new Error('Amount must be greater than zero');
        }

        const { fee, targetBlock } = await this.estimateSendFee(request, utxos);
        const totalBalance = getUtxoTotal(utxos);

        const amount = totalBalance.sub(fee);
        if (amount.weiAmount <= 0n) {
            throw new BtcInsufficientFundsForFeeError('Nothing left to send after the fee');
        }

        if (
            abs(request.estimatedAmount.weiAmount - amount.weiAmount) >
            MAX_ESTIMATE_DRIFT_TOLERANCE_SAT
        ) {
            throw new Error('Amount changed since it was estimated');
        }

        return new BtcTransactionTemplate(
            this.btcApi,
            this.wallet,
            {
                recipientAddress: request.recipientAddress,
                amount: totalBalance.sub(fee),
                hasChange: false
            },
            utxos,
            {
                fee: { amount: fee, type: 'crypto' },
                feeType: request.feeType,
                txTargetBlock: targetBlock
            },
            this.logger
        );
    }
}
