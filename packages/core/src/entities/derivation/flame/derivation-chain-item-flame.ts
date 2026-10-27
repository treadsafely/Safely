import { bytesToHex } from '@noble/hashes/utils.js';

import type { SFlameAccountChainItem } from '@safely/sync-storage';

import { FlameWalletId } from './flame-wallet-id';
import type { IDerivationChainItemFlame } from './I-derivation-chain-item-flame';
import type { FlameOutputAmount, FlameOutputBytes, FlameWallet } from './I-flame-wallet';
import type {
    FlameBuiltTransfer,
    FlameNetwork,
    FlameNoteOpening,
    FlameTransferRequest
} from '../../../di/safely-flame';
import type { Id } from '../../../utils/id';
import { assertUnreachable } from '../../../utils/types';
import { FLAME_RECEIVING_KEY_PATH } from '../../blockchain';
import type { ISeedProducer } from '../../seed/I-seed-producer';

function amountFromOpening(opening: FlameNoteOpening): FlameOutputAmount {
    if (opening.opened) {
        const memo = Buffer.from(opening.memo).toString('utf8');
        return {
            status: 'counted',
            qty: opening.qty,
            flavor: bytesToHex(opening.flavor),
            isNative: opening.isNative,
            ...(memo ? { memo } : {})
        };
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
        return {
            viewKey,
            receivingAddress: issued.receivingAddress,
            trackingAddress: issued.trackingAddress,
            predicate: bytesToHex(issued.predicate)
        };
    }

    public readonly network: FlameNetwork;

    // TODO: stored in plaintext for now (reads every amount and memo); encrypt via ISecretEncryptor
    private readonly viewKey: string;

    public readonly wallets: FlameWallet[];

    private readonly amountsCache = new Map<string, FlameOutputAmount>();

    private readonly seedProducer: ISeedProducer;

    constructor({
        ownerId,
        network,
        sChainItem,
        seedProducer
    }: {
        ownerId: Id;
        network: FlameNetwork;
        sChainItem: SFlameAccountChainItem;
        seedProducer: ISeedProducer;
    }) {
        this.seedProducer = seedProducer;
        this.network = network;
        this.viewKey = sChainItem.viewKey;
        this.wallets = [
            {
                id: new FlameWalletId(ownerId),
                network,
                receivingAddress: sChainItem.receivingAddress,
                trackingAddress: sChainItem.trackingAddress,
                predicate: sChainItem.predicate,
                readAmounts: outputs => this.readAmounts(outputs),
                buildTransfer: request => this.buildTransfer(request)
            }
        ];
    }

    private async readAmounts(
        outputs: FlameOutputBytes[]
    ): Promise<Map<string, FlameOutputAmount>> {
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
                            flavor: bytesToHex(value.flavor),
                            isNative: value.isNative
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

    private async buildTransfer(request: FlameTransferRequest): Promise<FlameBuiltTransfer> {
        const seed = await this.seedProducer.getSeed();
        try {
            return await globalThis.flameSdk.buildTransfer(
                seed,
                this.network,
                FLAME_RECEIVING_KEY_PATH,
                request
            );
        } finally {
            seed.fill(0);
        }
    }

    public toJSON(): SFlameAccountChainItem {
        return {
            viewKey: this.viewKey,
            receivingAddress: this.wallets[0].receivingAddress,
            trackingAddress: this.wallets[0].trackingAddress,
            predicate: this.wallets[0].predicate
        };
    }
}
