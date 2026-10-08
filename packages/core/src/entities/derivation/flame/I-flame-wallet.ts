import type { FlameWalletId } from './flame-wallet-id';
import type { FlameNetwork } from '../../../di/safely-flame';

export interface FlameWallet {
    id: FlameWalletId;
    network: FlameNetwork;
    address: string;
    predicate: string;
}

export type FlameOutputAmount =
    | { status: 'counted'; qty: bigint; flavor: string }
    | { status: 'unreadable' }
    | { status: 'flagged' }
    | { status: 'notToken' };

export interface FlameOutputBytes {
    id: string;
    contract: Uint8Array;
    note: Uint8Array | null;
}
