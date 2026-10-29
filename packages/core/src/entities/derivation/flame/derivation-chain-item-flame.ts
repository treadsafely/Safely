import { bytesToHex } from '@noble/hashes/utils.js';

import type { SFlameAccountChainItem } from '@safely/sync-storage';

import { FlameWalletId } from './flame-wallet-id';
import type { IDerivationChainItemFlame } from './I-derivation-chain-item-flame';
import type { FlameOutputAmount, FlameOutputBytes, FlameWallet } from './I-flame-wallet';
import type { ISilentSecretEncryptor } from '../../../di/I-secret-encryptor';
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

type FlameAddresses = Pick<
    SFlameAccountChainItem,
    'receivingAddress' | 'trackingAddress' | 'predicate'
>;

export class ViewKeyFlameWallet implements FlameWallet {
    public readonly id: FlameWalletId;

    public readonly receivingAddress: string;

    public readonly trackingAddress: string;

    public readonly predicate: string;

    private readonly amountsCache = new Map<string, FlameOutputAmount>();

    public readonly network: FlameNetwork;

    private readonly getViewKey: () => Promise<string>;

    private readonly seedProducer: ISeedProducer;

    constructor({
        ownerId,
        network,
        addresses,
        getViewKey,
        seedProducer
    }: {
        ownerId: Id;
        network: FlameNetwork;
        addresses: FlameAddresses;
        getViewKey: () => Promise<string>;
        seedProducer: ISeedProducer;
    }) {
        this.id = new FlameWalletId(ownerId);
        this.network = network;
        this.receivingAddress = addresses.receivingAddress;
        this.trackingAddress = addresses.trackingAddress;
        this.predicate = addresses.predicate;
        this.getViewKey = getViewKey;
        this.seedProducer = seedProducer;
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
                    await this.getViewKey(),
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

    public async buildTransfer(request: FlameTransferRequest): Promise<FlameBuiltTransfer> {
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
}

export class DerivationChainItemFlame implements IDerivationChainItemFlame {
    public static async createSChainItem(
        seedProducer: ISeedProducer,
        network: FlameNetwork,
        viewKeyEncryptor: ISilentSecretEncryptor
    ): Promise<SFlameAccountChainItem> {
        const { viewKey, addresses } = await DerivationChainItemFlame.derive(seedProducer, network);
        return { encryptedViewKey: await viewKeyEncryptor.encrypt(viewKey), ...addresses };
    }

    public static async derive(
        seedProducer: ISeedProducer,
        network: FlameNetwork
    ): Promise<{ viewKey: string; addresses: FlameAddresses }> {
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
            addresses: {
                receivingAddress: issued.receivingAddress,
                trackingAddress: issued.trackingAddress,
                predicate: bytesToHex(issued.predicate)
            }
        };
    }

    public readonly network: FlameNetwork;

    private readonly encryptedViewKey: string;

    public readonly wallets: FlameWallet[];

    constructor({
        ownerId,
        network,
        sChainItem,
        viewKeyEncryptor,
        seedProducer
    }: {
        ownerId: Id;
        network: FlameNetwork;
        sChainItem: SFlameAccountChainItem;
        viewKeyEncryptor: ISilentSecretEncryptor;
        seedProducer: ISeedProducer;
    }) {
        const { encryptedViewKey, ...addresses } = sChainItem;
        this.network = network;
        this.encryptedViewKey = encryptedViewKey;
        this.wallets = [
            new ViewKeyFlameWallet({
                ownerId,
                network,
                addresses,
                getViewKey: () => viewKeyEncryptor.decrypt(encryptedViewKey),
                seedProducer
            })
        ];
    }

    public toJSON(): SFlameAccountChainItem {
        return {
            encryptedViewKey: this.encryptedViewKey,
            receivingAddress: this.wallets[0].receivingAddress,
            trackingAddress: this.wallets[0].trackingAddress,
            predicate: this.wallets[0].predicate
        };
    }
}
