import { Address, NETWORK } from '@scure/btc-signer';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { BtcApi, BtcApiUtxo } from '../../../src/api/btc';
import { BtcEstimator } from '../../../src/blockchain-api/btc/btc-estimator';
import { BtcPsbtBuilder } from '../../../src/blockchain-api/btc/btc-psbt-builder';
import { BtcInsufficientFundsForFeeError } from '../../../src/blockchain-api/btc/errors';
import { BtcFeeType } from '../../../src/blockchain-api/btc/types';
import type { SignableBtcWallet } from '../../../src/entities';
import { BtcAssetAmount } from '../../../src/entities/asset';
import { BtcNetwork } from '../../../src/entities/blockchain';
import { OutputsAreSpendingMoreThanInputsError } from '../../../src/entities/errors/outputs-are-spending-more-than-inputs.error';

const mainnet = NETWORK;

function p2wpkhAddress(hashByte: number): string {
    return Address(mainnet).encode({ type: 'wpkh', hash: new Uint8Array(20).fill(hashByte) });
}

const WALLET_ADDR = p2wpkhAddress(0x11);
const RECIPIENT_ADDR = p2wpkhAddress(0x22);
const TXID = 'a'.repeat(64);

const FAST_FEE_SAT_VB = 10;
const SLOW_FEE_SAT_VB = 2;

function makeUtxo(overrides: Partial<BtcApiUtxo> = {}): BtcApiUtxo {
    return {
        txid: TXID,
        vout: 0,
        value: '100000',
        confirmations: 5,
        address: WALLET_ADDR,
        path: "m/84'/0'/0'/0/0",
        ...overrides
    };
}

function makeWallet(overrides: Partial<SignableBtcWallet> = {}): SignableBtcWallet {
    return {
        address: WALLET_ADDR,
        network: BtcNetwork.MAINNET,
        id: { toString: () => 'wallet-id' },
        sign: vi.fn(),
        ...overrides
    } as unknown as SignableBtcWallet;
}

function makeApi(): BtcApi {
    return {
        id: 'BtcApi:https://test.example',
        getFeePrice: vi.fn().mockResolvedValue({
            fast_send: { fee: FAST_FEE_SAT_VB, target_block: 1 },
            normal_send: { fee: SLOW_FEE_SAT_VB, target_block: 6 }
        }),
        sendTransaction: vi.fn()
    } as unknown as BtcApi;
}

// vSize helpers — derive expected fee from the actual builder so test values
// don't drift if PSBT serialization changes by a byte. We size the inputs
// so that bitcoinjs neither sees "outputs > inputs" nor an "absurd fee" when
// extracting the unsigned transaction.
const builder = new BtcPsbtBuilder(mainnet);

function feeWithChangeSat(utxos: BtcApiUtxo[], amount: bigint, feeRate: number): bigint {
    const inputs = utxos.map(u => ({ ...u, value: (amount + BigInt(u.value)).toString() }));
    const vSize = builder.calculateTransactionVSize({
        inputs,
        outputs: [
            { address: RECIPIENT_ADDR, value: amount },
            { address: WALLET_ADDR, value: 1n }
        ]
    });
    return BigInt(Math.ceil(Number(vSize) * feeRate));
}

function feeNoChangeSat(utxos: BtcApiUtxo[], feeRate: number): bigint {
    const vSize = builder.calculateTransactionVSize({
        inputs: utxos,
        outputs: [{ address: RECIPIENT_ADDR, value: 1n }]
    });
    return BigInt(Math.ceil(Number(vSize) * feeRate));
}

describe('BtcEstimator', () => {
    let api: BtcApi;
    let wallet: SignableBtcWallet;
    let estimator: BtcEstimator;

    beforeEach(() => {
        api = makeApi();
        wallet = makeWallet();
        estimator = new BtcEstimator(api, wallet);
    });

    describe('id', () => {
        it('composes its identity from api and wallet ids', () => {
            expect(estimator.id).toBe(`BtcEstimator:${api.id}:${wallet.id.toString()}`);
        });
    });

    describe('estimate (not-max)', () => {
        it('produces a template with change when leftover > dust threshold', async () => {
            const utxos = [makeUtxo({ value: '100000' })];
            const amount = 50_000n;

            const tpl = await estimator.estimate(
                {
                    type: 'not-max',
                    recipientAddress: RECIPIENT_ADDR,
                    amount: BtcAssetAmount.fromWeiAmount(amount),
                    feeType: BtcFeeType.FAST
                },
                utxos
            );

            const expectedFee = feeWithChangeSat(utxos, amount, FAST_FEE_SAT_VB);

            expect(tpl.request.hasChange).toBe(true);
            expect(tpl.request.recipientAddress).toBe(RECIPIENT_ADDR);
            expect(tpl.request.amount.weiAmount).toBe(amount);
            expect(tpl.estimation.fee.amount.weiAmount).toBe(expectedFee);
            expect(tpl.estimation.feeType).toBe(BtcFeeType.FAST);
            expect(tpl.estimation.txTargetBlock).toBe(1);
        });

        it('absorbs leftover into the fee when change would be below dust (294 sat)', async () => {
            const utxos = [makeUtxo()];
            const amount = 50_000n;
            const feeIfChange = feeWithChangeSat(utxos, amount, FAST_FEE_SAT_VB);
            // Pick a balance so that change = balance - amount - feeIfChange = 293 sat (< 294 dust).
            const balance = amount + feeIfChange + 293n;
            utxos[0].value = balance.toString();

            const tpl = await estimator.estimate(
                {
                    type: 'not-max',
                    recipientAddress: RECIPIENT_ADDR,
                    amount: BtcAssetAmount.fromWeiAmount(amount),
                    feeType: BtcFeeType.FAST
                },
                utxos
            );

            expect(tpl.request.hasChange).toBe(false);
            // fee is now whatever the remaining balance is after sending `amount`
            expect(tpl.estimation.fee.amount.weiAmount).toBe(balance - amount);
        });

        it('use no-change fee if balance - amount < feeWithChange', async () => {
            const utxos = [makeUtxo()];
            const amount = 50_000n;
            const feeNoChange = feeNoChangeSat(utxos, FAST_FEE_SAT_VB);
            const balance = amount + feeNoChange + 1n;
            utxos[0].value = balance.toString();

            const tpl = await estimator.estimate(
                {
                    type: 'not-max',
                    recipientAddress: RECIPIENT_ADDR,
                    amount: BtcAssetAmount.fromWeiAmount(amount),
                    feeType: BtcFeeType.FAST
                },
                utxos
            );

            expect(tpl.request.hasChange).toBe(false);
            // fee is now whatever the remaining balance is after sending `amount`
            expect(tpl.estimation.fee.amount.weiAmount).toBe(balance - amount);
        });

        it('can send max amount without max flag is amount is specified precisely as balance - feeNoChange', async () => {
            const utxos = [makeUtxo()];
            const amount = 50_000n;
            const feeNoChange = feeNoChangeSat(utxos, FAST_FEE_SAT_VB);
            const balance = amount + feeNoChange;
            utxos[0].value = balance.toString();

            const tpl = await estimator.estimate(
                {
                    type: 'not-max',
                    recipientAddress: RECIPIENT_ADDR,
                    amount: BtcAssetAmount.fromWeiAmount(amount),
                    feeType: BtcFeeType.FAST
                },
                utxos
            );

            expect(tpl.request.hasChange).toBe(false);
            // fee is now whatever the remaining balance is after sending `amount`
            expect(tpl.estimation.fee.amount.weiAmount).toBe(balance - amount);
        });

        it('treats exact change == dust threshold (294 sat) as "not dust" and keeps change', async () => {
            const utxos = [makeUtxo()];
            const amount = 50_000n;
            const feeIfChange = feeWithChangeSat(utxos, amount, FAST_FEE_SAT_VB);
            const balance = amount + feeIfChange + 294n;
            utxos[0].value = balance.toString();

            const tpl = await estimator.estimate(
                {
                    type: 'not-max',
                    recipientAddress: RECIPIENT_ADDR,
                    amount: BtcAssetAmount.fromWeiAmount(amount),
                    feeType: BtcFeeType.FAST
                },
                utxos
            );

            expect(tpl.request.hasChange).toBe(true);
            expect(tpl.estimation.fee.amount.weiAmount).toBe(feeIfChange);
        });

        it('uses normal_send fee bucket when feeType = SLOW', async () => {
            const utxos = [makeUtxo({ value: '100000' })];
            const amount = 50_000n;
            const expectedFee = feeWithChangeSat(utxos, amount, SLOW_FEE_SAT_VB);

            const tpl = await estimator.estimate(
                {
                    type: 'not-max',
                    recipientAddress: RECIPIENT_ADDR,
                    amount: BtcAssetAmount.fromWeiAmount(amount),
                    feeType: BtcFeeType.SLOW
                },
                utxos
            );

            expect(tpl.estimation.fee.amount.weiAmount).toBe(expectedFee);
            expect(tpl.estimation.feeType).toBe(BtcFeeType.SLOW);
            expect(tpl.estimation.txTargetBlock).toBe(6);
        });

        it('throws when amount is zero', async () => {
            await expect(
                estimator.estimate(
                    {
                        type: 'not-max',
                        recipientAddress: RECIPIENT_ADDR,
                        amount: BtcAssetAmount.fromWeiAmount(0n),
                        feeType: BtcFeeType.FAST
                    },
                    [makeUtxo()]
                )
            ).rejects.toThrow(/greater than zero/);
        });

        it('throws when UTXO set is empty', async () => {
            await expect(
                estimator.estimate(
                    {
                        type: 'not-max',
                        recipientAddress: RECIPIENT_ADDR,
                        amount: BtcAssetAmount.fromWeiAmount(1000n),
                        feeType: BtcFeeType.FAST
                    },
                    []
                )
            ).rejects.toThrow(/No UTXOs available/);
        });

        it('throws OutputsAreSpendingMoreThanInputsError when balance cannot cover the amount itself', async () => {
            await expect(
                estimator.estimate(
                    {
                        type: 'not-max',
                        recipientAddress: RECIPIENT_ADDR,
                        amount: BtcAssetAmount.fromWeiAmount(50_000n),
                        feeType: BtcFeeType.FAST
                    },
                    [makeUtxo({ value: '49999' })]
                )
            ).rejects.toBeInstanceOf(OutputsAreSpendingMoreThanInputsError);
        });

        it('throws when balance covers the amount but not the fee', async () => {
            // total balance is barely above amount but well below amount + fee
            await expect(
                estimator.estimate(
                    {
                        type: 'not-max',
                        recipientAddress: RECIPIENT_ADDR,
                        amount: BtcAssetAmount.fromWeiAmount(50_000n),
                        feeType: BtcFeeType.FAST
                    },
                    [makeUtxo({ value: '50001' })]
                )
            ).rejects.toBeInstanceOf(BtcInsufficientFundsForFeeError);
        });
    });

    describe('estimate (max)', () => {
        it('returns a template draining the wallet minus the fee', async () => {
            const utxos = [makeUtxo({ value: '100000' })];
            const expectedFee = feeNoChangeSat(utxos, FAST_FEE_SAT_VB);
            const expectedAmount = 100_000n - expectedFee;

            const tpl = await estimator.estimate(
                {
                    type: 'max',
                    recipientAddress: RECIPIENT_ADDR,
                    estimatedAmount: BtcAssetAmount.fromWeiAmount(expectedAmount),
                    feeType: BtcFeeType.FAST
                },
                utxos
            );

            expect(tpl.request.hasChange).toBe(false);
            expect(tpl.request.amount.weiAmount).toBe(expectedAmount);
            expect(tpl.estimation.fee.amount.weiAmount).toBe(expectedFee);
        });

        it('accepts an estimated amount within the fixed 10_000 sat drift tolerance', async () => {
            // Large balance so the recomputed max is far from any boundary; drift is a
            // fixed 9_999 sat < the 10_000 sat tolerance and must be accepted.
            const utxos = [makeUtxo({ value: '100000000' })];
            const expectedFee = feeNoChangeSat(utxos, FAST_FEE_SAT_VB);
            const realAmount = 100_000_000n - expectedFee;
            const estimated = realAmount + 9_999n;

            const tpl = await estimator.estimate(
                {
                    type: 'max',
                    recipientAddress: RECIPIENT_ADDR,
                    estimatedAmount: BtcAssetAmount.fromWeiAmount(estimated),
                    feeType: BtcFeeType.FAST
                },
                utxos
            );

            // The signed amount is the recomputed one, NOT the (drifted) estimate.
            expect(tpl.request.amount.weiAmount).toBe(realAmount);
        });

        it('throws when drift exceeds the fixed 10_000 sat tolerance (independent of fee)', async () => {
            const utxos = [makeUtxo({ value: '100000000' })];
            const expectedFee = feeNoChangeSat(utxos, FAST_FEE_SAT_VB);
            const realAmount = 100_000_000n - expectedFee;
            const estimated = realAmount + 10_001n;

            await expect(
                estimator.estimate(
                    {
                        type: 'max',
                        recipientAddress: RECIPIENT_ADDR,
                        estimatedAmount: BtcAssetAmount.fromWeiAmount(estimated),
                        feeType: BtcFeeType.FAST
                    },
                    utxos
                )
            ).rejects.toThrow(/Amount changed/);
        });

        it('throws when the displayed (estimated) amount is zero', async () => {
            // manipulated fee response can drive the form max to 0; the
            // estimator must never turn a displayed 0 into a positive signed output.
            await expect(
                estimator.estimate(
                    {
                        type: 'max',
                        recipientAddress: RECIPIENT_ADDR,
                        estimatedAmount: BtcAssetAmount.fromWeiAmount(0n),
                        feeType: BtcFeeType.FAST
                    },
                    [makeUtxo({ value: '100000' })]
                )
            ).rejects.toThrow(/greater than zero/);
        });

        it('throws when the recomputed amount is zero (balance == fee)', async () => {
            const utxos = [makeUtxo()];
            const fee = feeNoChangeSat(utxos, FAST_FEE_SAT_VB);
            utxos[0].value = fee.toString(); // balance == fee → recomputed amount == 0

            await expect(
                estimator.estimate(
                    {
                        type: 'max',
                        recipientAddress: RECIPIENT_ADDR,
                        estimatedAmount: BtcAssetAmount.fromWeiAmount(1n),
                        feeType: BtcFeeType.FAST
                    },
                    utxos
                )
            ).rejects.toBeInstanceOf(BtcInsufficientFundsForFeeError);
        });

        it('throws when UTXO set is empty', async () => {
            await expect(
                estimator.estimate(
                    {
                        type: 'max',
                        recipientAddress: RECIPIENT_ADDR,
                        estimatedAmount: BtcAssetAmount.fromWeiAmount(1n),
                        feeType: BtcFeeType.FAST
                    },
                    []
                )
            ).rejects.toThrow(/No UTXOs available/);
        });

        it('throws when total balance does not cover the fee', async () => {
            // 50 sat with 10 sat/vB cannot cover any P2WPKH spend (~1100 sat fee)
            await expect(
                estimator.estimate(
                    {
                        type: 'max',
                        recipientAddress: RECIPIENT_ADDR,
                        estimatedAmount: BtcAssetAmount.fromWeiAmount(1n),
                        feeType: BtcFeeType.FAST
                    },
                    [makeUtxo({ value: '50' })]
                )
            ).rejects.toBeInstanceOf(BtcInsufficientFundsForFeeError);
        });
    });

    describe('getSendFee', () => {
        it('returns the single-output spend fee for the FAST bucket', async () => {
            const utxos = [makeUtxo({ value: '100000' })];
            const expectedFee = feeNoChangeSat(utxos, FAST_FEE_SAT_VB);

            const fee = await estimator.getSendFee(
                { recipientAddress: RECIPIENT_ADDR, feeType: BtcFeeType.FAST },
                utxos
            );

            expect(fee.weiAmount).toBe(expectedFee);
        });

        it('returns the single-output spend fee for the SLOW bucket', async () => {
            const utxos = [makeUtxo({ value: '100000' })];
            const expectedFee = feeNoChangeSat(utxos, SLOW_FEE_SAT_VB);

            const fee = await estimator.getSendFee(
                { recipientAddress: RECIPIENT_ADDR, feeType: BtcFeeType.SLOW },
                utxos
            );

            expect(fee.weiAmount).toBe(expectedFee);
        });

        it('throws when no UTXOs are available', async () => {
            await expect(
                estimator.getSendFee(
                    { recipientAddress: RECIPIENT_ADDR, feeType: BtcFeeType.FAST },
                    []
                )
            ).rejects.toThrow(/No UTXOs available/);
        });
    });

    describe('non-segwit addresses', () => {
        // BtcAddress.type recognizes legacy '1'-prefix as P2PKH; we use a mainnet
        // P2PKH so the classifier returns "P2PKH" (instead of throwing "unknown")
        // and `assertSpendableUtxo` hits its non-P2WPKH rejection branch.
        const legacyMainnet = Address(mainnet).encode({
            type: 'pkh',
            hash: new Uint8Array(20).fill(0x33)
        });

        it('rejects non-P2WPKH input UTXO in not-max mode', async () => {
            await expect(
                estimator.estimate(
                    {
                        type: 'not-max',
                        recipientAddress: RECIPIENT_ADDR,
                        amount: BtcAssetAmount.fromWeiAmount(1_000n),
                        feeType: BtcFeeType.FAST
                    },
                    [makeUtxo({ address: legacyMainnet })]
                )
            ).rejects.toThrow(/unsupported utxo type/);
        });

        it('rejects non-P2WPKH input UTXO in max mode', async () => {
            await expect(
                estimator.estimate(
                    {
                        type: 'max',
                        recipientAddress: RECIPIENT_ADDR,
                        estimatedAmount: BtcAssetAmount.fromWeiAmount(1n),
                        feeType: BtcFeeType.FAST
                    },
                    [makeUtxo({ address: legacyMainnet })]
                )
            ).rejects.toThrow(/unsupported utxo type/);
        });

        it('rejects non-P2WPKH input UTXO in getSendFee', async () => {
            await expect(
                estimator.getSendFee(
                    { recipientAddress: RECIPIENT_ADDR, feeType: BtcFeeType.FAST },
                    [makeUtxo({ address: legacyMainnet })]
                )
            ).rejects.toThrow(/unsupported utxo type/);
        });
    });
});
