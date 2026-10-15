import type { SFlameAccountChainItem } from '@safely/sync-storage';

import type { FlameWalletId } from './flame-wallet-id';
import type { FlameOutputAmount, FlameOutputBytes, FlameWallet } from './I-flame-wallet';
import type { FlameBuiltTransfer, FlameNetwork, FlameTransferRequest } from '../../../di';

export interface IDerivationChainItemFlame {
    id: FlameWalletId;

    network: FlameNetwork;

    wallet: FlameWallet;

    readAmounts(outputs: FlameOutputBytes[]): Promise<Map<string, FlameOutputAmount>>;

    buildTransfer(request: FlameTransferRequest): Promise<FlameBuiltTransfer>;

    toJSON(): SFlameAccountChainItem;
}
