import { HDKey } from '@scure/bip32';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { BtcNetwork, BtcWalletType } from '../../../../src/entities/blockchain';
import { BtcBip32NodeProducer } from '../../../../src/entities/derivation/btc/implementations/bip39/btc-bip32-node-producer';
import type { ISeedProducer } from '../../../../src/entities/seed/I-seed-producer';

const SEED_BYTE = 7;
const SEED_LENGTH = 64;

// m -> m/84' -> m/84'/0' -> m/84'/0'/0'
const NODES_PER_DERIVATION = 4;

const expectedAccount = HDKey.fromMasterSeed(Buffer.alloc(SEED_LENGTH, SEED_BYTE)).derive(
    "m/84'/0'/0'"
);

function producerFor(seed: Buffer): BtcBip32NodeProducer {
    const seedProducer: ISeedProducer = { getSeed: () => Promise.resolve(seed) };

    return new BtcBip32NodeProducer(
        seedProducer,
        BtcWalletType.NATIVE_SEGWIT,
        BtcNetwork.MAINNET,
        0
    );
}

// The whole HD chain is created inside the producer, so the only way to inspect the master node
// and the intermediate nodes afterwards is to record what the constructors handed back.
function trackNodes({ throwAfter }: { throwAfter?: number } = {}): HDKey[] {
    const nodes: HDKey[] = [];
    const fromMasterSeed = HDKey.fromMasterSeed;
    const deriveChild = HDKey.prototype.deriveChild;

    vi.spyOn(HDKey, 'fromMasterSeed').mockImplementation(
        (...args: Parameters<typeof HDKey.fromMasterSeed>) => {
            const root = fromMasterSeed(...args);
            nodes.push(root);
            return root;
        }
    );

    vi.spyOn(HDKey.prototype, 'deriveChild').mockImplementation(function (
        this: HDKey,
        ...args: Parameters<HDKey['deriveChild']>
    ) {
        if (nodes.length === throwAfter) {
            throw new Error('derivation failed');
        }

        const child = deriveChild.apply(this, args);
        nodes.push(child);
        return child;
    });

    return nodes;
}

describe('BtcBip32NodeProducer key hygiene', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('zeroes the seed and wipes every node above the account one after deriving', async () => {
        const seed = Buffer.alloc(SEED_LENGTH, SEED_BYTE);
        const nodes = trackNodes();

        const account = await producerFor(seed).getPortfolioDerivation();

        expect(nodes).toHaveLength(NODES_PER_DERIVATION);
        expect(nodes.at(-1)).toBe(account);
        // The master node and both intermediates — m/84' and m/84'/0' — are private material the
        // producer no longer needs.
        for (const node of nodes.slice(0, -1)) {
            expect(node.privateKey).toBeNull();
        }
        // Wiping the chain must not disturb the node that is returned.
        expect(account.privateKey).toEqual(expectedAccount.privateKey);
        expect(seed.equals(Buffer.alloc(SEED_LENGTH))).toBe(true);
    });

    it('zeroes the seed and wipes every node when derivation throws mid-path', async () => {
        const seed = Buffer.alloc(SEED_LENGTH, SEED_BYTE);
        // Fails while deriving m/84'/0'/0', so the master node and both intermediates exist.
        const nodes = trackNodes({ throwAfter: NODES_PER_DERIVATION - 1 });

        await expect(producerFor(seed).getPortfolioDerivation()).rejects.toThrow(
            'derivation failed'
        );

        expect(nodes).toHaveLength(NODES_PER_DERIVATION - 1);
        for (const node of nodes) {
            expect(node.privateKey).toBeNull();
        }
        expect(seed.equals(Buffer.alloc(SEED_LENGTH))).toBe(true);
    });

    it('zeroes the seed and wipes the account node when it carries no private key', async () => {
        const seed = Buffer.alloc(SEED_LENGTH, SEED_BYTE);
        const nodes = trackNodes();

        vi.spyOn(HDKey.prototype, 'publicKey', 'get').mockReturnValue(null);

        await expect(producerFor(seed).getPortfolioDerivation()).rejects.toThrow(
            'Derived node has no private key'
        );

        expect(nodes).toHaveLength(NODES_PER_DERIVATION);
        for (const node of nodes) {
            expect(node.privateKey).toBeNull();
        }
        expect(seed.equals(Buffer.alloc(SEED_LENGTH))).toBe(true);
    });
});
