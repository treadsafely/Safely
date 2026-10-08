import { bytesToHex } from '@noble/hashes/utils.js';

import type { SFlameAccountChainItem } from '@safely/sync-storage';

import { FlameWalletId } from './flame-wallet-id';
import type { IDerivationChainItemFlame } from './I-derivation-chain-item-flame';
import type { FlameOutputAmount, FlameOutputBytes, FlameWallet } from './I-flame-wallet';
import type { FlameNetwork, FlameNoteOpening } from '../../../di/safely-flame';
import { assertUnreachable } from '../../../utils/types';
import { FLAME_RECEIVING_KEY_PATH, flameNetworkByPortfolioNetworkType } from '../../blockchain';
import type { ISeedProducer } from '../../seed/I-seed-producer';
import type { Derivation } from '../derivation';

function amountFromOpening(opening: FlameNoteOpening): FlameOutputAmount {
    if (opening.opened) {
        return { status: 'counted', qty: opening.qty, flavor: bytesToHex(opening.flavor) };
    }

    const { failure } = opening;
    switch (failure) {
        case 'openingMismatch':
            return { status: 'flagged' };
        case 'missing':
        case 'malformed':
        case 'unknownVersion':
        case 'undecryptable':
        case 'notConfidential':
        case 'error':
            return { status: 'unreadable' };
        default:
            assertUnreachable(failure);
    }
}

export class DerivationChainItemFlame implements IDerivationChainItemFlame {
    public static async createSChainItem(
        seedProducer: ISeedProducer,
        network: FlameNetwork
    ): Promise<SFlameAccountChainItem> {
        const seed = await seedProducer.getSeed();
        let viewKey: string;
        try {
            viewKey = await globalThis.flameSdk.viewKey(seed, network);
        } finally {
            seed.fill(0);
        }

        const issued = await globalThis.flameSdk.address(
            viewKey,
            network,
            FLAME_RECEIVING_KEY_PATH
        );
        return { viewKey, address: issued.address, predicate: bytesToHex(issued.predicate) };
    }

    public readonly id: FlameWalletId;

    public readonly network: FlameNetwork;

    // TODO: stored in plaintext for now (reads every amount and memo); encrypt via ISecretEncryptor
    private readonly viewKey: string;

    public readonly wallet: FlameWallet;

    private readonly amountsCache = new Map<string, FlameOutputAmount>();

    constructor({
        derivationRef,
        sChainItem
    }: {
        derivationRef: Derivation;
        sChainItem: SFlameAccountChainItem;
    }) {
        this.id = new FlameWalletId(derivationRef.id);
        this.network = flameNetworkByPortfolioNetworkType(derivationRef.portfolioRef.networkType);
        this.viewKey = sChainItem.viewKey;
        this.wallet = {
            id: this.id,
            network: this.network,
            address: sChainItem.address,
            predicate: sChainItem.predicate
        };
    }

    public async readAmounts(outputs: FlameOutputBytes[]): Promise<Map<string, FlameOutputAmount>> {
        const uncached = outputs.filter(output => !this.amountsCache.has(output.id));
        const fresh = new Map<string, FlameOutputAmount>();
        const retryLater = new Set<string>();

        if (uncached.length) {
            const decodings = await globalThis.flameSdk.decodeContracts(
                uncached.map(output => output.contract)
            );

            const confidential: FlameOutputBytes[] = [];
            uncached.forEach((output, i) => {
                const decoding = decodings[i];
                if (!decoding.decoded) {
                    fresh.set(output.id, { status: 'unreadable' });
                    retryLater.add(output.id);
                    return;
                }

                const { value } = decoding.info;
                switch (value.type) {
                    case 'clear':
                        fresh.set(output.id, {
                            status: 'counted',
                            qty: value.qty,
                            flavor: bytesToHex(value.flavor)
                        });
                        break;
                    case 'other':
                        fresh.set(output.id, { status: 'notToken' });
                        break;
                    case 'confidential':
                        confidential.push(output);
                        break;
                    default:
                        assertUnreachable(value);
                }
            });

            if (confidential.length) {
                const openings = await globalThis.flameSdk.openNotes(
                    this.viewKey,
                    this.network,
                    FLAME_RECEIVING_KEY_PATH,
                    confidential.map(({ contract, note }) => ({ contract, note }))
                );
                confidential.forEach((output, i) => {
                    const opening = openings[i];
                    fresh.set(output.id, amountFromOpening(opening));
                    if (
                        !opening.opened &&
                        (opening.failure === 'missing' || opening.failure === 'error')
                    ) {
                        retryLater.add(output.id);
                    }
                });
            }
        }

        // A missing note or a native error may not repeat on the next scan, so those are read again
        fresh.forEach((amount, id) => {
            if (!retryLater.has(id)) this.amountsCache.set(id, amount);
        });

        return new Map(
            outputs.map(output => [
                output.id,
                fresh.get(output.id) ?? this.amountsCache.get(output.id)!
            ])
        );
    }

    public toJSON(): SFlameAccountChainItem {
        return {
            viewKey: this.viewKey,
            address: this.wallet.address,
            predicate: this.wallet.predicate
        };
    }
}
