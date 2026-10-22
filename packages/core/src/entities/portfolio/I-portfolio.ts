import type { z } from 'zod';

import {
    sPortfolioBip39Source,
    sPortfolioType,
    sPortfolioWatchOnlySource
} from '@safely/sync-storage';

import type { Id } from '../../utils/id';
import type { VM_TYPE } from '../blockchain';
import type {
    IDerivation,
    IDerivationChainItemFlame,
    ILedgerDerivation,
    WalletReadOnly
} from '../derivation';
import type { PortfolioMeta } from './portfolio-meta';
import type { PortfolioNetworkType } from './portfolio-network-type';

export const PortfolioType = sPortfolioType.enum;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type PortfolioType = z.infer<typeof sPortfolioType>;

export const Bip39Source = sPortfolioBip39Source.enum;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Bip39Source = z.infer<typeof sPortfolioBip39Source>;

export const WatchOnlySource = sPortfolioWatchOnlySource.enum;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type WatchOnlySource = z.infer<typeof sPortfolioWatchOnlySource>;

export interface IPortfolioId extends Id {
    network: PortfolioNetworkType;
}

export interface IPortfolioBase {
    id: IPortfolioId;
    meta: PortfolioMeta;
    type: PortfolioType;
    networkType: PortfolioNetworkType;
    toJSON(): unknown;
}

export interface IPortfolioDerivable extends IPortfolioBase {
    derivations: IDerivation[];
    getDerivation(id: Id): IDerivation | undefined;
    getDerivations(): IDerivation[];
}

export interface IPortfolioBip39 extends IPortfolioDerivable {
    type: typeof PortfolioType.BIP39;
    secretRevealedStatus: PortfolioSecretRevealedStatus;

    withAddedDerivation(index: number): Promise<IPortfolioBip39>;
    withAddedNextDerivation(): Promise<IPortfolioBip39>;
    withoutDerivation(index: number): IPortfolioBip39;
}

export interface IPortfolioWatchOnly extends IPortfolioBase {
    type: typeof PortfolioType.WATCH_ONLY;
    vmType: VM_TYPE;
    wallet: WalletReadOnly;
}

export interface IPortfolioLedger extends IPortfolioDerivable {
    type: typeof PortfolioType.LEDGER;
    masterFingerprint: Buffer;
    deviceModel: string;

    derivations: ILedgerDerivation[];
    getDerivations(): ILedgerDerivation[];
}

export interface IPortfolioFlameDevnet extends IPortfolioBase {
    type: typeof PortfolioType.FLAME_DEVNET;
    flame: IDerivationChainItemFlame;
}

export type PortfolioSecretRevealedStatus = {
    revealedAt: Date;
    revealedFromDevice: string;
} | null;
