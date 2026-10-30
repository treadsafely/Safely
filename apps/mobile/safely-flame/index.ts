import type { SafelyFlame } from '@safely/core';

import {
    address,
    buildTransfer,
    decodeContracts,
    deriveViewKey,
    memoMaxBytes,
    openNotes,
    replaceProofs,
    validateReceivingAddress
} from '../modules/safely-flame/src';

export const flameSdk: SafelyFlame = {
    viewKey: deriveViewKey,

    address: (viewKey, network, path) => address(viewKey, network, path.branch, path.index),

    validateReceivingAddress,

    memoMaxBytes,

    async decodeContracts(contracts) {
        const decodings = await decodeContracts(contracts);
        return decodings.map(decoding => {
            if (!decoding.decoded) {
                return { decoded: false, reason: decoding.error.message };
            }
            const { value } = decoding.info;
            return {
                decoded: true,
                info: {
                    ...decoding.info,
                    value: value.type === 'clear' ? { ...value, qty: BigInt(value.qty) } : value
                }
            };
        });
    },

    async openNotes(viewKey, network, path, notes) {
        const openings = await openNotes(viewKey, network, path.branch, path.index, notes);
        return openings.map(opening => {
            if (opening.opened) {
                return { ...opening, qty: BigInt(opening.qty) };
            }
            return opening.failure === 'error'
                ? { opened: false, failure: 'error', reason: opening.error.message }
                : opening;
        });
    },

    buildTransfer: (seed, network, path, request) =>
        buildTransfer(seed, network, path.branch, path.index, {
            inputs: request.inputs,
            outputs: request.outputs.map(({ address: to, qty, memo }) => ({
                address: to,
                qty: qty.toString(),
                memo: memo ?? new Uint8Array(0)
            })),
            fee: request.fee.toString(),
            gas: request.gas.toString()
        }),

    replaceProofs
};

global.flameSdk = flameSdk;
