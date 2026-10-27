import { describe, expect, it, vi } from 'vitest';

import type {
    FlameApi,
    FlameApiProof,
    FlameApiUnspentEntry,
    FlameOutputAmount,
    FlameWallet
} from '../../../src';
import {
    FLAME_RPC_ERROR_CODE,
    FLAME_TRANSFER_FEE,
    FLAME_TRANSFER_GAS,
    FlameApiError,
    FlameEstimator,
    FlameInputsSpentError,
    FlameInsufficientBalanceError,
    FlameOutputs
} from '../../../src';

const hex = (fill: string) => fill.repeat(64);
const SELF = 'tf1self';
const RECIPIENT = 'tf1recipient';
const TXID = hex('e');

const entry = (id: string): FlameApiUnspentEntry => ({ id: hex(id), bytes: 'AQID', note: 'BAUG' });

const counted = (qty: bigint): FlameOutputAmount => ({
    status: 'counted',
    qty,
    flavor: 'native',
    isNative: true
});

function setup(proofs?: (ids: string[]) => FlameApiProof[]) {
    const outputs = FlameOutputs.fromUnspent(
        [entry('1'), entry('2'), entry('3'), entry('5')],
        new Map<string, FlameOutputAmount>([
            [hex('1'), counted(10_000n)],
            [hex('2'), counted(50_000n)],
            [hex('3'), counted(20_000n)],
            [hex('5'), { status: 'unreadable' }]
        ])
    );
    const api = {
        id: 'api',
        proofs: vi.fn((ids: string[]) =>
            Promise.resolve(
                proofs?.(ids) ?? ids.map(() => ({ status: 'unspent' as const, proof: 'BwgJ' }))
            )
        ),
        submitTx: vi.fn((_: string) => Promise.resolve(TXID))
    };
    const wallet = {
        id: { toString: () => 'wallet' },
        receivingAddress: SELF,
        buildTransfer: vi.fn<FlameWallet['buildTransfer']>(() =>
            Promise.resolve({ txid: new Uint8Array(32), blockTx: Uint8Array.of(1, 2, 3) })
        )
    };
    const estimator = new FlameEstimator(
        api as unknown as FlameApi,
        wallet as unknown as FlameWallet
    );
    return { outputs, api, wallet, estimator };
}

describe('FlameEstimator', () => {
    it('spends every readable unspent output but the fee on max', () => {
        const { outputs, estimator } = setup();

        expect(estimator.getMaxSendValue(outputs).weiAmount).toBe(80_000n - FLAME_TRANSFER_FEE);
    });

    it('picks the largest outputs first and returns the rest as change', () => {
        const { outputs, estimator } = setup();

        const template = estimator.estimate(
            { recipientAddress: RECIPIENT, amount: 55_000n, isMax: false, memo: '' },
            outputs
        );

        expect(template.outputs).toEqual([
            { address: RECIPIENT, qty: 55_000n, memo: new Uint8Array(0) },
            { address: SELF, qty: 70_000n - 55_000n - FLAME_TRANSFER_FEE, memo: new Uint8Array(0) }
        ]);
        expect(template.estimation.fee.amount.weiAmount).toBe(FLAME_TRANSFER_FEE);
    });

    it('sends max without change', () => {
        const { outputs, estimator } = setup();

        const template = estimator.estimate(
            { recipientAddress: RECIPIENT, amount: 0n, isMax: true, memo: '' },
            outputs
        );

        expect(template.request.amount.weiAmount).toBe(80_000n - FLAME_TRANSFER_FEE);
        expect(template.outputs).toEqual([
            { address: RECIPIENT, qty: 80_000n - FLAME_TRANSFER_FEE, memo: new Uint8Array(0) }
        ]);
    });

    it('refuses an amount the outputs cannot cover with the fee', () => {
        const { outputs, estimator } = setup();

        expect(() =>
            estimator.estimate(
                { recipientAddress: RECIPIENT, amount: 80_000n, isMax: false, memo: '' },
                outputs
            )
        ).toThrow(FlameInsufficientBalanceError);
    });
});

describe('FlameTransactionTemplate', () => {
    const estimate = (ctx: ReturnType<typeof setup>) =>
        ctx.estimator.estimate(
            { recipientAddress: RECIPIENT, amount: 5_000n, isMax: false, memo: 'gm ✓' },
            ctx.outputs
        );

    it('proves, builds and submits the transfer', async () => {
        const ctx = setup();

        const result = await estimate(ctx).send();

        expect(result.txId).toBe(TXID);
        expect(ctx.api.proofs).toHaveBeenCalledWith([hex('2')]);
        expect(ctx.wallet.buildTransfer).toHaveBeenCalledWith({
            inputs: [
                {
                    contract: Uint8Array.of(1, 2, 3),
                    note: Uint8Array.of(4, 5, 6),
                    proof: Uint8Array.of(7, 8, 9)
                }
            ],
            outputs: [
                {
                    address: RECIPIENT,
                    qty: 5_000n,
                    memo: Uint8Array.of(0x67, 0x6d, 0x20, 0xe2, 0x9c, 0x93)
                },
                {
                    address: SELF,
                    qty: 50_000n - 5_000n - FLAME_TRANSFER_FEE,
                    memo: Uint8Array.of(0x67, 0x6d, 0x20, 0xe2, 0x9c, 0x93)
                }
            ],
            fee: FLAME_TRANSFER_FEE,
            gas: FLAME_TRANSFER_GAS
        });
        expect(ctx.api.submitTx).toHaveBeenCalledWith('AQID');
    });

    it('rebuilds once with fresh proofs when the mempool rejects', async () => {
        const ctx = setup();
        ctx.api.submitTx.mockRejectedValueOnce(
            new FlameApiError('stale', 0, undefined, FLAME_RPC_ERROR_CODE.MEMPOOL_REJECTED)
        );

        await expect(estimate(ctx).send()).resolves.toMatchObject({ txId: TXID });
        expect(ctx.api.proofs).toHaveBeenCalledTimes(2);
        expect(ctx.wallet.buildTransfer).toHaveBeenCalledTimes(2);
    });

    it('gives up after the second mempool rejection', async () => {
        const ctx = setup();
        const rejection = new FlameApiError(
            'stale',
            0,
            undefined,
            FLAME_RPC_ERROR_CODE.MEMPOOL_REJECTED
        );
        ctx.api.submitTx.mockRejectedValue(rejection);

        await expect(estimate(ctx).send()).rejects.toBe(rejection);
        expect(ctx.api.submitTx).toHaveBeenCalledTimes(2);
    });

    it('refuses to build when an input is no longer unspent', async () => {
        const ctx = setup(ids => ids.map(() => ({ status: 'spent', height: 3, txid: hex('d') })));

        await expect(estimate(ctx).send()).rejects.toBeInstanceOf(FlameInputsSpentError);
        expect(ctx.wallet.buildTransfer).not.toHaveBeenCalled();
    });
});
