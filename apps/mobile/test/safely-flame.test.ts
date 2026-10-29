import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = {
    viewKey: vi.fn(),
    address: vi.fn(),
    decodeContracts: vi.fn(),
    openNotes: vi.fn(),
    buildTransfer: vi.fn(),
    validateReceivingAddress: vi.fn(),
    memoMaxBytes: vi.fn()
};

vi.mock('expo-modules-core', () => ({ requireNativeModule: () => native }));

const { address, openNotes, FlameError } = await import('../modules/safely-flame/src');
const { flameSdk } = await import('../safely-flame');

const SEED = new Uint8Array(64).fill(1);
const VIEW_KEY = 'testview1example';
const PATH = { branch: 0, index: 0 };

const containsBytes = (value: unknown): boolean => {
    if (value instanceof Uint8Array) return true;
    if (value !== null && typeof value === 'object')
        return Object.values(value).some(containsBytes);
    return false;
};

describe('safely-flame facade', () => {
    beforeEach(() => {
        native.viewKey.mockReset();
        native.address.mockReset();
        native.decodeContracts.mockReset();
        native.openNotes.mockReset();
        native.buildTransfer.mockReset();
        native.validateReceivingAddress.mockReset();
    });

    it('returns the native value on success', async () => {
        const predicate = new Uint8Array(32);
        const issued = {
            receivingAddress: 't1examplei1key',
            trackingAddress: 't1example',
            predicate
        };
        native.address.mockResolvedValue({ ok: true, value: issued });

        await expect(address(VIEW_KEY, 'testnet', 0, 3)).resolves.toEqual(issued);
        expect(native.address).toHaveBeenCalledWith(VIEW_KEY, 'testnet', 0, 3);
    });

    it('turns a native failure into a FlameError with kind and reason', async () => {
        native.address.mockResolvedValue({
            ok: false,
            code: 'ERR_FLAME_INVALID_KEY',
            reason: 'not a view key'
        });

        const result = address(VIEW_KEY, 'testnet', 0, 0);

        await expect(result).rejects.toBeInstanceOf(FlameError);
        await expect(result).rejects.toMatchObject({
            kind: 'invalidKey',
            reason: 'not a view key'
        });
    });

    it('maps an unknown native code to internal', async () => {
        native.decodeContracts.mockResolvedValue({
            ok: false,
            code: 'ERR_FLAME_SOMETHING_NEW',
            reason: 'new failure'
        });

        await expect(flameSdk.decodeContracts([new Uint8Array(1)])).rejects.toMatchObject({
            kind: 'internal',
            reason: 'new failure'
        });
    });

    it.each([
        ['an unknown network', () => address(VIEW_KEY, 'regtest' as 'testnet', 0, 0)],
        ['a negative branch', () => address(VIEW_KEY, 'testnet', -1, 0)],
        ['an index above uint32', () => address(VIEW_KEY, 'testnet', 0, 2 ** 32)],
        ['a fractional index', () => openNotes(VIEW_KEY, 'testnet', 0, 1.5, [])],
        ['an unknown view key network', () => flameSdk.viewKey(SEED, 'regtest' as 'testnet')]
    ])('rejects %s before calling native', async (_, call) => {
        await expect(call()).rejects.toMatchObject({ kind: 'invalidArgument' });
        expect(native.viewKey).not.toHaveBeenCalled();
        expect(native.address).not.toHaveBeenCalled();
        expect(native.openNotes).not.toHaveBeenCalled();
    });

    it('copies a Buffer seed into a plain Uint8Array before crossing the bridge', async () => {
        native.viewKey.mockResolvedValue({ ok: true, value: VIEW_KEY });

        await expect(flameSdk.viewKey(Buffer.from(SEED), 'testnet')).resolves.toBe(VIEW_KEY);

        const [seed] = native.viewKey.mock.calls[0] as [Uint8Array];
        expect(seed.constructor).toBe(Uint8Array);
    });

    it('wipes its seed copy once native returns, even on failure', async () => {
        let seenSeed: Uint8Array | undefined;
        native.viewKey.mockImplementation((seed: Uint8Array) => {
            seenSeed = new Uint8Array(seed);
            return Promise.resolve({ ok: false, code: 'ERR_FLAME_INVALID_SEED', reason: 'bad' });
        });

        await expect(flameSdk.viewKey(Buffer.from(SEED), 'testnet')).rejects.toMatchObject({
            kind: 'invalidSeed'
        });

        const [copy] = native.viewKey.mock.calls[0] as [Uint8Array];
        expect(seenSeed).toEqual(SEED);
        expect(copy.every(byte => byte === 0)).toBe(true);
    });

    it('passes a missing note as an empty array and parses u64 amounts into bigint', async () => {
        const flavor = new Uint8Array(32).fill(2);
        native.openNotes.mockResolvedValue({
            ok: true,
            value: [
                {
                    opened: true,
                    qty: '18446744073709551615',
                    flavor,
                    isNative: false,
                    memo: new Uint8Array(0)
                },
                { opened: false, failure: 'missing' }
            ]
        });
        const contract = new Uint8Array([1, 2, 3]);
        const note = new Uint8Array([4, 5]);

        const openings = await flameSdk.openNotes(VIEW_KEY, 'testnet', PATH, [
            { contract, note },
            { contract, note: null }
        ]);

        expect(native.openNotes).toHaveBeenCalledWith(
            VIEW_KEY,
            'testnet',
            0,
            0,
            [contract, contract],
            [note, new Uint8Array(0)]
        );
        expect(openings).toEqual([
            {
                opened: true,
                qty: 18446744073709551615n,
                flavor,
                isNative: false,
                memo: new Uint8Array(0)
            },
            { opened: false, failure: 'missing' }
        ]);
    });

    it('parses the cleartext amount of a decoded contract into bigint', async () => {
        const id = new Uint8Array(32);
        const flavor = new Uint8Array(32);
        native.decodeContracts.mockResolvedValue({
            ok: true,
            value: [
                {
                    decoded: true,
                    id,
                    predicate: id,
                    value: { type: 'clear', qty: '42', flavor, isNative: true }
                },
                { decoded: true, id, predicate: id, value: { type: 'confidential' } }
            ]
        });

        await expect(flameSdk.decodeContracts([id, id])).resolves.toEqual([
            {
                decoded: true,
                info: {
                    id,
                    predicate: id,
                    value: { type: 'clear', qty: 42n, flavor, isNative: true }
                }
            },
            { decoded: true, info: { id, predicate: id, value: { type: 'confidential' } } }
        ]);
    });

    it('keeps a per-contract decode failure next to the decoded contracts', async () => {
        const id = new Uint8Array(32);
        native.decodeContracts.mockResolvedValue({
            ok: true,
            value: [
                { decoded: false, code: 'ERR_FLAME_INVALID_BYTES', reason: 'contract: too short' },
                { decoded: true, id, predicate: id, value: { type: 'other' } }
            ]
        });

        await expect(flameSdk.decodeContracts([id, id])).resolves.toEqual([
            { decoded: false, reason: 'invalidBytes: contract: too short' },
            { decoded: true, info: { id, predicate: id, value: { type: 'other' } } }
        ]);
    });

    it('keeps a per-note library error next to the opened notes', async () => {
        const flavor = new Uint8Array(32);
        native.openNotes.mockResolvedValue({
            ok: true,
            value: [
                {
                    opened: false,
                    failure: 'error',
                    code: 'ERR_FLAME_KEY_MISMATCH',
                    reason: 'input 0'
                },
                { opened: true, qty: '1', flavor, isNative: true, memo: new Uint8Array(0) }
            ]
        });
        const contract = new Uint8Array([1]);

        await expect(
            flameSdk.openNotes(VIEW_KEY, 'testnet', PATH, [
                { contract, note: null },
                { contract, note: null }
            ])
        ).resolves.toEqual([
            { opened: false, failure: 'error', reason: 'keyMismatch: input 0' },
            { opened: true, qty: 1n, flavor, isNative: true, memo: new Uint8Array(0) }
        ]);
    });

    it('answers an address check synchronously and throws a native failure as a FlameError', () => {
        native.validateReceivingAddress.mockReturnValueOnce({ ok: true, value: true });
        native.validateReceivingAddress.mockReturnValueOnce({
            ok: false,
            code: 'ERR_FLAME_INVALID_ARGUMENT',
            reason: 'unknown network'
        });

        expect(flameSdk.validateReceivingAddress('t1examplei1key', 'testnet')).toBe(true);
        expect(() => flameSdk.validateReceivingAddress('t1examplei1key', 'testnet')).toThrow(
            FlameError
        );
    });

    describe('buildTransfer', () => {
        const request = {
            inputs: [{ contract: Buffer.from([1]), note: null, proof: Buffer.from([2]) }],
            outputs: [
                { address: 'tf1recipient', qty: 2n ** 64n - 1n, memo: Buffer.from([7]) },
                { address: 'tf1change', qty: 1n }
            ],
            fee: 1_000n,
            gas: 1_000_000n
        };

        it('sends u64 amounts as strings and binary inputs as plain arrays', async () => {
            const transfer = { txid: new Uint8Array(32), blockTx: new Uint8Array([9]) };
            native.buildTransfer.mockResolvedValue({ ok: true, value: transfer });

            await expect(
                flameSdk.buildTransfer(Buffer.from(SEED), 'testnet', PATH, request)
            ).resolves.toEqual(transfer);

            const [seed, contracts, notes, proofs, memos, plan] = native.buildTransfer.mock
                .calls[0] as [
                Uint8Array,
                Uint8Array[],
                Uint8Array[],
                Uint8Array[],
                Uint8Array[],
                Record<string, unknown>
            ];
            expect(seed.every(byte => byte === 0)).toBe(true);
            expect(contracts.map(c => c.constructor)).toEqual([Uint8Array]);
            expect(notes).toEqual([new Uint8Array(0)]);
            expect(proofs).toEqual([new Uint8Array([2])]);
            expect(memos.map(m => m.constructor)).toEqual([Uint8Array, Uint8Array]);
            expect(memos).toEqual([new Uint8Array([7]), new Uint8Array(0)]);
            expect(containsBytes(plan)).toBe(false);
            expect(plan).toEqual({
                network: 'testnet',
                branch: 0,
                index: 0,
                addresses: ['tf1recipient', 'tf1change'],
                qtys: ['18446744073709551615', '1'],
                fee: '1000',
                gas: '1000000'
            });
        });

        it('rejects an amount above u64 before calling native', async () => {
            await expect(
                flameSdk.buildTransfer(SEED, 'testnet', PATH, {
                    ...request,
                    outputs: [{ address: 'tf1recipient', qty: 2n ** 64n }]
                })
            ).rejects.toMatchObject({ kind: 'invalidArgument' });
            expect(native.buildTransfer).not.toHaveBeenCalled();
        });

        it('turns a native transfer failure into a FlameError', async () => {
            native.buildTransfer.mockResolvedValue({
                ok: false,
                code: 'ERR_FLAME_TRANSFER',
                reason: 'inputs do not balance'
            });

            await expect(
                flameSdk.buildTransfer(SEED, 'testnet', PATH, request)
            ).rejects.toMatchObject({ kind: 'transfer', reason: 'inputs do not balance' });
        });
    });
});
