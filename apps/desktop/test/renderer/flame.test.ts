import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FlameNetwork } from '@safely/core';

class WasmFlameError extends Error {
    public override readonly name = 'FlameError';

    constructor(
        public readonly kind: string,
        public readonly failure?: string
    ) {
        super(`${kind}: ${failure ?? ''}`);
    }
}

const wallet = {
    viewKey: vi.fn(),
    address: vi.fn(),
    openNote: vi.fn(),
    buildTransfer: vi.fn(),
    free: vi.fn(),
    [Symbol.dispose]: vi.fn()
};

const wasm = {
    init: vi.fn(),
    fromSeed: vi.fn(),
    fromViewKey: vi.fn(),
    decodeContract: vi.fn(),
    memoMaxBytes: vi.fn(),
    replaceProofs: vi.fn(),
    validateReceivingAddress: vi.fn()
};

vi.mock('@runflame/wallet-wasm', () => ({
    default: wasm.init,
    Wallet: { fromSeed: wasm.fromSeed, fromViewKey: wasm.fromViewKey },
    decodeContract: wasm.decodeContract,
    memoMaxBytes: wasm.memoMaxBytes,
    replaceProofs: wasm.replaceProofs,
    validateReceivingAddress: wasm.validateReceivingAddress
}));

vi.mock('@runflame/wallet-wasm/flamewallet_wasm_bg.wasm?url', () => ({ default: 'flame.wasm' }));

const { flameSdk, loadFlameSdk } = await import('../../src/renderer/platform/flame');

const SEED = new Uint8Array(64).fill(1);
const VIEW_KEY = 'testview1example';
const PATH = { branch: 0, index: 0 };
const TESTNET = FlameNetwork.TESTNET;
const bytes = (fill: number): Uint8Array => new Uint8Array(4).fill(fill);

const clear = { kind: 'clear', qty: 5n, flavor: bytes(7), isNative: true };
const confidential = { kind: 'confidential' };

describe('flame sdk over wasm', () => {
    beforeEach(() => {
        Object.values(wallet).forEach(fn => fn.mockReset());
        wallet[Symbol.dispose].mockReset();
        Object.values(wasm).forEach(fn => fn.mockReset());
        wasm.fromSeed.mockReturnValue(wallet);
        wasm.fromViewKey.mockReturnValue(wallet);
    });

    it('loads the module once, from the bundled url', async () => {
        wasm.init.mockResolvedValue({});

        await Promise.all([loadFlameSdk(), loadFlameSdk()]);

        expect(wasm.init).toHaveBeenCalledTimes(1);
        expect(wasm.init).toHaveBeenCalledWith({ module_or_path: 'flame.wasm' });
    });

    it('derives the view key from a seed wallet and frees it', async () => {
        wallet.viewKey.mockReturnValue(VIEW_KEY);

        await expect(flameSdk.viewKey(SEED, TESTNET)).resolves.toBe(VIEW_KEY);

        expect(wasm.fromSeed).toHaveBeenCalledWith(SEED, 'testnet', 0);
        expect(wallet[Symbol.dispose]).toHaveBeenCalledTimes(1);
    });

    it('issues an address from the view key', async () => {
        const issued = {
            path: PATH,
            receivingAddress: 't1examplei1key',
            trackingAddress: 't1example',
            predicate: bytes(2)
        };
        wallet.address.mockReturnValue(issued);

        await expect(flameSdk.address(VIEW_KEY, TESTNET, PATH)).resolves.toEqual({
            receivingAddress: issued.receivingAddress,
            trackingAddress: issued.trackingAddress,
            predicate: issued.predicate
        });

        expect(wasm.fromViewKey).toHaveBeenCalledWith(VIEW_KEY, 'testnet', 0);
        expect(wallet.address).toHaveBeenCalledWith(PATH);
        expect(wallet[Symbol.dispose]).toHaveBeenCalledTimes(1);
    });

    it('rejects, and still frees the wallet, when the library throws', async () => {
        wallet.viewKey.mockImplementation(() => {
            throw new WasmFlameError('invalidSeed');
        });

        await expect(flameSdk.viewKey(SEED, TESTNET)).rejects.toThrow('invalidSeed');

        expect(wallet[Symbol.dispose]).toHaveBeenCalledTimes(1);
    });

    it('answers the synchronous checks straight from the module', () => {
        wasm.validateReceivingAddress.mockReturnValue(true);
        wasm.memoMaxBytes.mockReturnValue(255);

        expect(flameSdk.validateReceivingAddress('t1x', TESTNET)).toBe(true);
        expect(wasm.validateReceivingAddress).toHaveBeenCalledWith('t1x', 'testnet');
        expect(flameSdk.memoMaxBytes()).toBe(255);
    });

    it('decodes each contract on its own, keeping a failure next to the decoded ones', async () => {
        const info = { id: bytes(1), predicate: bytes(2), value: clear };
        wasm.decodeContract
            .mockReturnValueOnce(info)
            .mockImplementationOnce(() => {
                throw new WasmFlameError('invalidBytes');
            })
            .mockReturnValueOnce({ ...info, value: confidential });

        await expect(flameSdk.decodeContracts([bytes(1), bytes(2), bytes(3)])).resolves.toEqual([
            {
                decoded: true,
                info: {
                    id: info.id,
                    predicate: info.predicate,
                    value: { type: 'clear', qty: 5n, flavor: clear.flavor, isNative: true }
                }
            },
            { decoded: false, reason: 'invalidBytes: ' },
            { decoded: true, info: { ...info, value: { type: 'confidential' } } }
        ]);
    });

    it('opens notes one by one, mapping a note failure and a library error apart', async () => {
        const received = {
            opening: { qty: 9n, flavor: bytes(7), qtyBlinding: bytes(0), flavorBlinding: bytes(0) },
            isNative: true,
            memo: bytes(4)
        };
        wallet.openNote
            .mockReturnValueOnce(received)
            .mockImplementationOnce(() => {
                throw new WasmFlameError('note', 'undecryptable');
            })
            .mockImplementationOnce(() => {
                throw new Error('boom');
            });

        const notes = [
            { contract: bytes(1), note: bytes(2) },
            { contract: bytes(3), note: null },
            { contract: bytes(5), note: bytes(6) }
        ];

        await expect(flameSdk.openNotes(VIEW_KEY, TESTNET, PATH, notes)).resolves.toEqual([
            {
                opened: true,
                qty: 9n,
                flavor: received.opening.flavor,
                isNative: true,
                memo: received.memo
            },
            { opened: false, failure: 'undecryptable' },
            { opened: false, failure: 'error', reason: 'boom' }
        ]);

        expect(wallet.openNote).toHaveBeenNthCalledWith(2, bytes(3), null, PATH);
        expect(wallet[Symbol.dispose]).toHaveBeenCalledTimes(1);
    });

    it('opens the confidential inputs of a transfer and leaves the cleartext ones closed', async () => {
        const opening = {
            qty: 9n,
            flavor: bytes(7),
            qtyBlinding: bytes(0),
            flavorBlinding: bytes(0)
        };
        wasm.decodeContract.mockImplementation((contract: Uint8Array) => ({
            id: contract,
            predicate: contract,
            value: contract[0] === 1 ? confidential : clear
        }));
        wallet.openNote.mockReturnValue({ opening, isNative: true, memo: bytes(0) });
        wallet.buildTransfer.mockReturnValue({ txid: bytes(8), blockTx: bytes(9), outputs: [] });

        const request = {
            inputs: [
                { contract: bytes(1), note: bytes(2), proof: bytes(3) },
                { contract: bytes(4), note: null, proof: bytes(5) }
            ],
            outputs: [{ address: 't1to', qty: 7n, memo: bytes(6) }],
            fee: 1000n,
            gas: 1_000_000n
        };

        await expect(flameSdk.buildTransfer(SEED, TESTNET, PATH, request)).resolves.toEqual({
            txid: bytes(8),
            blockTx: bytes(9)
        });

        expect(wallet.openNote).toHaveBeenCalledTimes(1);
        expect(wallet.openNote).toHaveBeenCalledWith(bytes(1), bytes(2), PATH);
        expect(wallet.buildTransfer).toHaveBeenCalledWith({
            inputs: [
                { contract: bytes(1), proof: bytes(3), path: PATH, opening },
                { contract: bytes(4), proof: bytes(5), path: PATH, opening: undefined }
            ],
            outputs: [{ address: 't1to', qty: 7n, memo: bytes(6) }],
            fee: 1000n,
            gas: 1_000_000n
        });
        expect(wallet[Symbol.dispose]).toHaveBeenCalledTimes(1);
    });

    it('replaces proofs without a wallet', async () => {
        wasm.replaceProofs.mockReturnValue(bytes(1));

        await expect(flameSdk.replaceProofs(bytes(2), [bytes(3)])).resolves.toEqual(bytes(1));
        expect(wasm.replaceProofs).toHaveBeenCalledWith(bytes(2), [bytes(3)]);
    });
});
