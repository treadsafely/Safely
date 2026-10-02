import { Address, OutScript, Transaction } from '@scure/btc-signer';
import type { BTC_NETWORK } from '@scure/btc-signer/utils.js';

import { BtcAddress } from './btc-address';
import type { BtcApiUtxo } from '../../api/btc';

export type PsbtRequest = {
    inputs: BtcApiUtxo[];
    outputs: { address: string; value: bigint }[];
};

// Worst-case ECDSA signature in DER encoding plus 1-byte sighash flag (BIP66).
const MAX_DER_SIGNATURE_SIZE = 73;
// Compressed secp256k1 public key: 1-byte parity prefix + 32-byte X coordinate.
const COMPRESSED_PUBKEY_SIZE = 33;
// P2WPKH witness stack: <signature> <pubkey>. Used only for vSize estimation.
const P2WPKH_ESTIMATION_WITNESS = [
    new Uint8Array(MAX_DER_SIGNATURE_SIZE),
    new Uint8Array(COMPRESSED_PUBKEY_SIZE)
];

// BIP125 opt-in Replace-By-Fee: any sequence <= 0xfffffffd signals to relays
// that this tx may be replaced by a higher-fee version while still in mempool.
const RBF_SEQUENCE = 0xfffffffd;

export class BtcPsbtBuilder {
    constructor(private readonly bitcoinNetwork: BTC_NETWORK) {}

    public buildPsbt(req: PsbtRequest, prevTxs?: Map<string, Uint8Array>): Transaction {
        return this.build(req, { forEstimation: false, prevTxs });
    }

    public calculateTransactionVSize(req: PsbtRequest): bigint {
        const tx = this.build(req, { forEstimation: true });
        return BigInt(tx.vsize);
    }

    private build(
        { inputs, outputs }: PsbtRequest,
        options:
            { forEstimation: true } | { forEstimation: false; prevTxs?: Map<string, Uint8Array> }
    ): Transaction {
        const tx = new Transaction();

        outputs.forEach(o => {
            if (!BtcAddress.validate(o.address, this.bitcoinNetwork)) {
                throw new Error(`invalid output address: ${o.address}`);
            }
            tx.addOutputAddress(o.address, o.value, this.bitcoinNetwork);
        });

        inputs.forEach(utxo => {
            if (!utxo.address) {
                throw new Error('invalid address');
            }

            const decoded = Address(this.bitcoinNetwork).decode(utxo.address);
            if (decoded?.type !== 'wpkh') {
                throw new Error('unsupported utxo type: only P2WPKH inputs are supported');
            }

            const base = {
                txid: Buffer.from(utxo.txid, 'hex'),
                index: utxo.vout,
                sequence: RBF_SEQUENCE,
                witnessUtxo: { script: OutScript.encode(decoded), amount: BigInt(utxo.value) }
            };

            if (options.forEstimation) {
                tx.addInput({ ...base, finalScriptWitness: P2WPKH_ESTIMATION_WITNESS }, true);
                return;
            }

            if (!options.prevTxs) {
                tx.addInput(base);
                return;
            }

            const prevTx = options.prevTxs.get(utxo.txid);
            if (!prevTx) {
                throw new Error(`missing previous transaction for input ${utxo.txid}`);
            }

            const parsedPrevTx = Transaction.fromRaw(prevTx, {
                allowUnknownOutputs: true,
                disableScriptCheck: true
            });
            if (parsedPrevTx.id !== utxo.txid) {
                throw new Error(`previous transaction txid mismatch for input ${utxo.txid}`);
            }

            if (parsedPrevTx.getOutput(utxo.vout).amount !== BigInt(utxo.value)) {
                throw new Error(
                    `previous transaction output amount mismatch for input ${utxo.txid}`
                );
            }

            tx.addInput({ ...base, nonWitnessUtxo: prevTx });
        });

        return tx;
    }
}
