import type { SFlameAccountChainItem } from '@safely/sync-storage';

import type { FlameWallet } from './I-flame-wallet';
import type { FlameNetwork } from '../../../di';

export interface IDerivationChainItemFlame {
    wallets: FlameWallet[];

    network: FlameNetwork;

    toJSON(): SFlameAccountChainItem;
}
