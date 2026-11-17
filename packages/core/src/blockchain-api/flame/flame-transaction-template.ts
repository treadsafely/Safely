import type { Logger } from '@safely/sync';

import { FlameInputsSpentError, FlameSendStatusUnknownError } from './errors';
import { encodeFlameMemo } from './flame-memo';
import type { FlameOutput } from './flame-outputs';
import type { FlameEstimation } from './types';
import type { FlameApi, FlameApiTxStatus } from '../../api/flame';
import type { FlameBuiltTransfer, FlameNetwork, FlameTransferOutput } from '../../di/safely-flame';
import type { ExplorerFactory, FlameAssetAmount, FlameWallet } from '../../entities';
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
        const memo = encodeFlameMemo(this.request.memo);
        const recipient = {
            address: this.request.recipientAddress,
            qty: this.request.amount.weiAmount,
            memo
        };
        if (this.request.change <= 0n) {
            return [recipient];
        }
        // the recipient's note is sealed to their view key, so the sender reads the memo back from the change
        return [
            recipient,
            { address: this.wallet.receivingAddress, qty: this.request.change, memo }
        ];
    }

    constructor(
        private readonly api: FlameApi,
        private readonly wallet: FlameWallet,
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
        const built = await this.build();
        const txId = Buffer.from(built.txid).toString('hex');
        for (let attempt = 1; ; attempt++) {
            // The node admits only proofs against its current tip, and the build waits on the passcode
            const blockTx = await globalThis.flameSdk.replaceProofs(
                built.blockTx,
                await this.fetchProofs()
            );
            try {
                return createSendResult(
                    await this.api.submitTx(Buffer.from(blockTx).toString('base64')),
                    this.wallet.network
                );
            } catch (error) {
                // A lost response or a duplicate submit still means the node holds the transfer
                const status = await this.fetchStatus(txId);
                if (status === 'mempool' || status === 'confirmed') {
                    return createSendResult(txId, this.wallet.network);
                }
                if (status === null) {
                    throw new FlameSendStatusUnknownError(txId, { cause: error });
                }
                if (attempt >= SUBMIT_ATTEMPTS) {
                    throw error;
                }
                this.logger?.warn('the node did not take the transfer, resubmitting', error);
            }
        }
    }

    private async build(): Promise<FlameBuiltTransfer> {
        const proofs = await this.fetchProofs();
        return this.wallet.buildTransfer({
            inputs: this.inputs.map((input, i) => ({
                contract: input.bytes.contract,
                note: input.bytes.note,
                proof: proofs[i]
            })),
            outputs: this.outputs,
            fee: this.estimation.fee.amount.weiAmount,
            gas: FLAME_TRANSFER_GAS
        });
    }

    private async fetchStatus(txId: string): Promise<FlameApiTxStatus['status'] | null> {
        try {
            return (await this.api.txStatus(txId)).status;
        } catch (error) {
            this.logger?.warn('transfer status unavailable', error);
            return null;
        }
    }

    private async fetchProofs(): Promise<Uint8Array[]> {
        const proofs = await this.api.proofs(this.inputs.map(input => input.id));
        return proofs.map(proof => {
            if (proof.status !== 'unspent') {
                throw new FlameInputsSpentError();
            }
            return Uint8Array.from(Buffer.from(proof.proof, 'base64'));
        });
    }
}

function createSendResult(txId: string, network: FlameNetwork): FlameSendResult {
    return {
        blockchain: BLOCKCHAIN_NAME.FLAME,
        txId,
        toString() {
            return ellipsisMiddle(txId, 6);
        },
        toExplorerUrl(explorerFactory: ExplorerFactory): string | null {
            return (
                explorerFactory.createExplorer(BLOCKCHAIN_NAME.FLAME, network)?.transaction(txId) ??
                null
            );
        }
    };
}

export interface FlameSendResult {
    blockchain: BLOCKCHAIN_NAME.FLAME;
    txId: string;
    toString(): string;
    toExplorerUrl(explorerFactory: ExplorerFactory): string | null;
}
