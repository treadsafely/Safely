import { HDKey } from '@scure/bip32';
import { getAddress, NETWORK } from '@scure/btc-signer';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { BtcApiUtxo } from '../../../../src/api/btc';
import { BtcPsbtBuilder } from '../../../../src/blockchain-api/btc/btc-psbt-builder';
import type { IBtcNodeProducer } from '../../../../src/entities/derivation/btc/I-btc-node-producer';
import { BtcKeypairSigner } from '../../../../src/entities/signer/btc/btc-keypair-signer';

const MASTER_SEED = new Uint8Array(64).fill(7);

// A deterministic HD tree so the input address matches the key the signer derives.
const referenceNode = HDKey.fromMasterSeed(MASTER_SEED);
const signingChild = referenceNode.deriveChild(0).deriveChild(0);

const WALLET_ADDR = getAddress('wpkh', signingChild.privateKey!, NETWORK);
const RECIPIENT_ADDR = getAddress(
    'wpkh',
    referenceNode.deriveChild(0).deriveChild(1).privateKey!,
    NETWORK
);

const TXID = 'a'.repeat(64);

function utxo(value: string): BtcApiUtxo {
    return {
        txid: TXID,
        vout: 0,
        value,
        confirmations: 5,
        address: WALLET_ADDR
    } as BtcApiUtxo;
}

// The signer wipes the node it is handed, so — like the real producer, which
// re-derives from the seed — every call must yield a fresh node.
function nodeProducer(handedOut: HDKey[] = []): IBtcNodeProducer {
    return {
        getPortfolioDerivation: () => {
            const node = HDKey.fromMasterSeed(MASTER_SEED);
            handedOut.push(node);
            return Promise.resolve(node);
        }
    };
}

function sign(
    inputValue: string,
    outputValue: bigint,
    options: { producer?: IBtcNodeProducer; addressIndex?: number } = {}
): Promise<Buffer> {
    const psbt = new BtcPsbtBuilder(NETWORK).buildPsbt({
        inputs: [utxo(inputValue)],
        outputs: [{ address: RECIPIENT_ADDR, value: outputValue }]
    });

    return new BtcKeypairSigner(options.producer ?? nodeProducer()).sign({
        psbt,
        utxos: [{ derivationPath: { change: 0, addressIndex: options.addressIndex ?? 0 } }]
    });
}

// Records every node produced by deriveChild, including the intermediate change
// node the signer would otherwise keep out of the test's reach.
function trackDerivedNodes(): HDKey[] {
    const derived: HDKey[] = [];
    const deriveChild = HDKey.prototype.deriveChild;

    vi.spyOn(HDKey.prototype, 'deriveChild').mockImplementation(function (
        this: HDKey,
        ...args: Parameters<HDKey['deriveChild']>
    ) {
        const child = deriveChild.apply(this, args);
        derived.push(child);
        return child;
    });

    return derived;
}

describe('BtcKeypairSigner absurd-fee guard', () => {
    it('signs and extracts a transaction with a reasonable fee', async () => {
        // 100_000 in, 99_800 out → 200 sat fee over ~110 vB ≈ 2 sat/vB.
        const signed = await sign('100000', 99_800n);

        expect(Buffer.isBuffer(signed)).toBe(true);
        expect(signed.length).toBeGreaterThan(0);
    });

    it('refuses to sign when the implied fee rate exceeds the safety limit', async () => {
        // 1 BTC in, 1 sat out → ~909_000 sat/vB, far above the 5000 sat/vB cap.
        await expect(sign('100000000', 1n)).rejects.toThrow(/exceeds the 5000 sat\/vB/);
    });
});

describe('BtcKeypairSigner key hygiene', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('wipes the account node and every derived node after a successful signing', async () => {
        const handedOut: HDKey[] = [];
        const derived = trackDerivedNodes();

        await sign('100000', 99_800n, { producer: nodeProducer(handedOut) });

        expect(handedOut).toHaveLength(1);
        // The change node and the address node that actually signed the input.
        expect(derived).toHaveLength(2);
        for (const node of [...handedOut, ...derived]) {
            expect(node.privateKey).toBeNull();
        }
    });

    it('wipes the account node and every derived node when signing throws', async () => {
        const handedOut: HDKey[] = [];
        const derived = trackDerivedNodes();

        // Address index 5 derives a key that does not match the input's script.
        await expect(
            sign('100000', 99_800n, { producer: nodeProducer(handedOut), addressIndex: 5 })
        ).rejects.toThrow();

        expect(handedOut).toHaveLength(1);
        expect(derived).toHaveLength(2);
        for (const node of [...handedOut, ...derived]) {
            expect(node.privateKey).toBeNull();
        }
    });
});
