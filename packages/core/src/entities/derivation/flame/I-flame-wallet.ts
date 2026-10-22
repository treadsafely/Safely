import type { FlameWalletId } from './flame-wallet-id';
import type {
    FlameBuiltTransfer,
    FlameNetwork,
    FlameTransferRequest
} from '../../../di/safely-flame';

export interface FlameWallet {
    id: FlameWalletId;
    network: FlameNetwork;
    address: string;
    predicate: string;

    readAmounts(outputs: FlameOutputBytes[]): Promise<Map<string, FlameOutputAmount>>;

    buildTransfer(request: FlameTransferRequest): Promise<FlameBuiltTransfer>;
}

export type FlameOutputAmount =
    | { status: 'counted'; qty: bigint; flavor: string; memo?: string }
    | { status: 'unreadable' }
    | { status: 'flagged' }
    | { status: 'notToken' };

export interface FlameOutputBytes {
    id: string;
    contract: Uint8Array;
    note: Uint8Array | null;
}
