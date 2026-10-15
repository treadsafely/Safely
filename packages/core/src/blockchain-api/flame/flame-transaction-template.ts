import type { Logger } from '@safely/sync';

import { FlameInputsSpentError } from './errors';
import { encodeFlameMemo } from './flame-memo';
import type { FlameOutput } from './flame-outputs';
import type { FlameEstimation } from './types';
import type { FlameApi } from '../../api/flame';
import { FLAME_RPC_ERROR_CODE, FlameApiError } from '../../api/flame';
import type { FlameTransferOutput } from '../../di/safely-flame';
import type { FlameAssetAmount, IDerivationChainItemFlame } from '../../entities';
import { BLOCKCHAIN_NAME } from '../../entities/blockchain';
import { ellipsisMiddle } from '../../utils';

// A limit, not a price: gas is not charged yet, and the largest transfer burns under 40k
export const FLAME_TRANSFER_GAS = 1_000_000n;

const SUBMIT_ATTEMPTS = 2;

export class FlameTransactionTemplate {
    public readonly blockchain = BLOCKCHAIN_NAME.FLAME;

    public sendResult: FlameSendResult | undefined;

    private isSending = false;

    private readonly logger?: Logger;

    public get outputs(): FlameTransferOutput[] {
        const recipient = {
            address: this.request.recipientAddress,
            qty: this.request.amount.weiAmount,
            memo: encodeFlameMemo(this.request.memo)
        };
        if (this.request.change <= 0n) {
            return [recipient];
        }
        return [recipient, { address: this.chain.wallet.address, qty: this.request.change }];
    }

    public get spentOutputIds(): string[] {
        return this.inputs.map(input => input.id);
    }

    constructor(
        private readonly api: FlameApi,
        private readonly chain: IDerivationChainItemFlame,
        public readonly request: {
            recipientAddress: string;
            amount: FlameAssetAmount;
            memo: string;
            change: bigint;
        },
        private readonly inputs: FlameOutput[],
        public readonly estimation: FlameEstimation,
        logger?: Logger
    ) {
        this.logger = logger?.child('FlameTransactionTemplate');
    }

    public async send(): Promise<FlameSendResult> {
        if (this.sendResult) {
            throw new Error(`Tx is already published, ${this.sendResult.txId}`);
        }

        if (this.isSending) {
            throw new Error('Tx in progress');
        }

        this.isSending = true;
        this.logger?.info('broadcasting transaction', { blockchain: this.blockchain });

        try {
            this.sendResult = await this._send();
            this.logger?.info('transaction broadcast succeeded', { txId: this.sendResult.txId });
            return this.sendResult;
        } catch (error) {
            this.logger?.error('transaction broadcast failed', error);
            throw error;
        } finally {
            this.isSending = false;
        }
    }

    private async _send(): Promise<FlameSendResult> {
        for (let attempt = 1; ; attempt++) {
            const blockTx = await this.build();
            try {
                const txId = await this.api.submitTx(Buffer.from(blockTx).toString('base64'));
                return createSendResult(txId);
            } catch (error) {
                // Proofs outlive their tip by one block only, so a slow build is rejected as stale
                const isStale =
                    error instanceof FlameApiError &&
                    error.rpcCode === FLAME_RPC_ERROR_CODE.MEMPOOL_REJECTED;
                if (!isStale || attempt >= SUBMIT_ATTEMPTS) {
                    throw error;
                }
                this.logger?.warn('mempool rejected the transfer, rebuilding with fresh proofs');
            }
        }
    }

    private async build(): Promise<Uint8Array> {
        const proofs = await this.api.proofs(this.inputs.map(input => input.id));

        const inputs = this.inputs.map((input, i) => {
            const proof = proofs[i];
            if (proof.status !== 'unspent') {
                throw new FlameInputsSpentError();
            }
            return {
                contract: input.bytes.contract,
                note: input.bytes.note,
                proof: Uint8Array.from(Buffer.from(proof.proof, 'base64'))
            };
        });

        const built = await this.chain.buildTransfer({
            inputs,
            outputs: this.outputs,
            fee: this.estimation.fee.amount.weiAmount,
            gas: FLAME_TRANSFER_GAS
        });
        return built.blockTx;
    }
}

function createSendResult(txId: string): FlameSendResult {
    return {
        blockchain: BLOCKCHAIN_NAME.FLAME,
        txId,
        toString() {
            return ellipsisMiddle(txId, 6);
        },
        toExplorerUrl() {
            return null;
        }
    };
}

export interface FlameSendResult {
    blockchain: BLOCKCHAIN_NAME.FLAME;
    txId: string;
    toString(): string;
    toExplorerUrl(): null;
}
