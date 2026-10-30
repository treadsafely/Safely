import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
    FlameApi,
    FlameApiProof,
    FlameApiTxStatus,
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
    FlameOutputs,
    FlameSendStatusUnknownError
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
        submitTx: vi.fn((_: string) => Promise.resolve(TXID)),
        txStatus: vi.fn((_: string): Promise<FlameApiTxStatus> =>
            Promise.resolve({ status: 'unknown' })
        )
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
    const replaceProofs = vi
        .spyOn(globalThis.flameSdk, 'replaceProofs')
        .mockImplementation((blockTx, proofs) =>
            Promise.resolve(Uint8Array.of(...blockTx, ...proofs.flatMap(proof => [...proof])))
        );
    return { outputs, api, wallet, estimator, replaceProofs };
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
    afterEach(() => {
        vi.restoreAllMocks();
    });

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
        expect(ctx.replaceProofs).toHaveBeenCalledWith(Uint8Array.of(1, 2, 3), [
            Uint8Array.of(7, 8, 9)
        ]);
        expect(ctx.api.submitTx).toHaveBeenCalledWith(
            Buffer.from(Uint8Array.of(1, 2, 3, 7, 8, 9)).toString('base64')
        );
    });

    it('refreshes the proofs after the build, which waits on the passcode', async () => {
        let call = 0;
        const ctx = setup(ids => ids.map(() => ({ status: 'unspent', proof: `AA${++call}` })));

        await estimate(ctx).send();

        expect(ctx.wallet.buildTransfer.mock.calls[0][0].inputs[0].proof).toEqual(
            Uint8Array.from(Buffer.from('AA1', 'base64'))
        );
        expect(ctx.replaceProofs.mock.calls[0][1]).toEqual([
            Uint8Array.from(Buffer.from('AA2', 'base64'))
        ]);
    });

    it('resubmits with fresh proofs and builds once when the mempool rejects', async () => {
        const ctx = setup();
        ctx.api.submitTx.mockRejectedValueOnce(
            new FlameApiError('stale', 0, undefined, FLAME_RPC_ERROR_CODE.MEMPOOL_REJECTED)
        );

        await expect(estimate(ctx).send()).resolves.toMatchObject({ txId: TXID });
        expect(ctx.api.proofs).toHaveBeenCalledTimes(3);
        expect(ctx.replaceProofs).toHaveBeenCalledTimes(2);
        expect(ctx.wallet.buildTransfer).toHaveBeenCalledTimes(1);
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

    it('reports success when the mempool rejects a transfer it already holds', async () => {
        const ctx = setup();
        ctx.api.submitTx.mockRejectedValueOnce(
            new FlameApiError('duplicate', 0, undefined, FLAME_RPC_ERROR_CODE.MEMPOOL_REJECTED)
        );
        ctx.api.txStatus.mockResolvedValueOnce({ status: 'mempool' });

        await expect(estimate(ctx).send()).resolves.toMatchObject({ txId: '00'.repeat(32) });
        expect(ctx.api.txStatus).toHaveBeenCalledWith('00'.repeat(32));
        expect(ctx.api.submitTx).toHaveBeenCalledTimes(1);
        expect(ctx.replaceProofs).toHaveBeenCalledTimes(1);
    });

    it('resubmits the same transfer after a network error the node never saw', async () => {
        const ctx = setup();
        ctx.api.submitTx.mockRejectedValueOnce(new Error('timeout'));

        await expect(estimate(ctx).send()).resolves.toMatchObject({ txId: TXID });
        expect(ctx.api.submitTx).toHaveBeenCalledTimes(2);
        expect(ctx.wallet.buildTransfer).toHaveBeenCalledTimes(1);
    });

    it('reports success when the response is lost but the node holds the transfer', async () => {
        const ctx = setup();
        ctx.api.submitTx.mockRejectedValueOnce(new Error('timeout'));
        ctx.api.txStatus.mockResolvedValueOnce({ status: 'mempool' });

        await expect(estimate(ctx).send()).resolves.toMatchObject({ txId: '00'.repeat(32) });
        expect(ctx.api.txStatus).toHaveBeenCalledWith('00'.repeat(32));
        expect(ctx.api.submitTx).toHaveBeenCalledTimes(1);
    });

    it('reports an unknown status, not a failure, when the status cannot be read', async () => {
        const ctx = setup();
        ctx.api.submitTx.mockRejectedValueOnce(new Error('timeout'));
        ctx.api.txStatus.mockRejectedValueOnce(new Error('offline'));

        const error = await estimate(ctx)
            .send()
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(FlameSendStatusUnknownError);
        expect((error as Error).message).toContain('00'.repeat(32));
        expect(ctx.api.submitTx).toHaveBeenCalledTimes(1);
    });

    it('refuses to build when an input is no longer unspent', async () => {
        const ctx = setup(ids => ids.map(() => ({ status: 'spent', height: 3, txid: hex('d') })));

        await expect(estimate(ctx).send()).rejects.toBeInstanceOf(FlameInputsSpentError);
        expect(ctx.wallet.buildTransfer).not.toHaveBeenCalled();
    });
});
