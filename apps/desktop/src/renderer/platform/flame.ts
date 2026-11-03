import type {
    ContractValue,
    FlameError,
    KeyPath,
    TransferInput,
    Wallet as FlameWallet
} from '@runflame/wallet-wasm';
import init, {
    decodeContract,
    memoMaxBytes,
    replaceProofs,
    validateReceivingAddress,
    Wallet
} from '@runflame/wallet-wasm';
import wasmUrl from '@runflame/wallet-wasm/flamewallet_wasm_bg.wasm?url';

import type {
    FlameContractDecoding,
    FlameContractValue,
    FlameNoteOpening,
    SafelyFlame
} from '@safely/core';

const isFlameError = (error: unknown): error is FlameError =>
    error instanceof Error && error.name === 'FlameError';

const reasonOf = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

function toContractValue(value: ContractValue): FlameContractValue {
    switch (value.kind) {
        case 'clear':
            return {
                type: 'clear',
                qty: value.qty,
                flavor: value.flavor,
                isNative: value.isNative
            };
        case 'confidential':
            return { type: 'confidential' };
        case 'other':
            return { type: 'other' };
    }
}

function toContractDecoding(contract: Uint8Array): FlameContractDecoding {
    try {
        const { id, predicate, value } = decodeContract(contract);

        return { decoded: true, info: { id, predicate, value: toContractValue(value) } };
    } catch (error) {
        return { decoded: false, reason: reasonOf(error) };
    }
}

function openNote(
    wallet: FlameWallet,
    contract: Uint8Array,
    note: Uint8Array | null,
    path: KeyPath
): FlameNoteOpening {
    try {
        const { opening, isNative, memo } = wallet.openNote(contract, note, path);

        return { opened: true, qty: opening.qty, flavor: opening.flavor, isNative, memo };
    } catch (error) {
        if (isFlameError(error) && error.kind === 'note' && error.failure !== undefined) {
            return { opened: false, failure: error.failure };
        }

        return { opened: false, failure: 'error', reason: reasonOf(error) };
    }
}

const isConfidential = (contract: Uint8Array): boolean =>
    decodeContract(contract).value.kind === 'confidential';

let loading: Promise<void> | undefined;

export function loadFlameSdk(): Promise<void> {
    loading ??= init({ module_or_path: wasmUrl }).then(() => undefined);

    return loading;
}

export const flameSdk: SafelyFlame = {
    async viewKey(seed, network) {
        using wallet = Wallet.fromSeed(seed, network, 0);

        return wallet.viewKey();
    },

    async address(viewKey, network, path) {
        using wallet = Wallet.fromViewKey(viewKey, network, 0);
        const { receivingAddress, trackingAddress, predicate } = wallet.address(path);

        return { receivingAddress, trackingAddress, predicate };
    },

    validateReceivingAddress(address, network) {
        return validateReceivingAddress(address, network);
    },

    memoMaxBytes,

    async decodeContracts(contracts) {
        return contracts.map(toContractDecoding);
    },

    async openNotes(viewKey, network, path, notes) {
        using wallet = Wallet.fromViewKey(viewKey, network, 0);

        return notes.map(({ contract, note }) => openNote(wallet, contract, note, path));
    },

    /* a confidential input is opened here, so its blindings never leave this module */
    async buildTransfer(seed, network, path, request) {
        using wallet = Wallet.fromSeed(seed, network, 0);

        const inputs = request.inputs.map(({ contract, note, proof }): TransferInput => ({
            contract,
            proof,
            path,
            opening: isConfidential(contract)
                ? wallet.openNote(contract, note, path).opening
                : undefined
        }));
        const { txid, blockTx } = wallet.buildTransfer({
            inputs,
            outputs: request.outputs.map(({ address, qty, memo }) => ({ address, qty, memo })),
            fee: request.fee,
            gas: request.gas
        });

        return { txid, blockTx };
    },

    async replaceProofs(blockTx, proofs) {
        return replaceProofs(blockTx, proofs);
    }
};
