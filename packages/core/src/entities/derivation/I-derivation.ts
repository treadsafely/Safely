import type { SDerivation, SLedgerDerivation } from '@safely/sync-storage';

import type { IPortfolioBase } from '../portfolio';
import type { IDerivationChainItemBtc } from './btc/I-derivation-chain-item-btc';
import type { Id } from '../../utils/id';

export interface IDerivationId extends Id {
    derivationIndex: number;
    portfolioId: Id;
}

export type DerivationMeta = {
    name: string;
};

export interface IDerivation {
    index: number;
    id: IDerivationId;
    chains: IDerivationChains;
    portfolioRef: IPortfolioBase;

    toJSON(): SDerivation;
}

export interface ILedgerDerivation extends IDerivation {
    meta: DerivationMeta;

    toJSON(): SLedgerDerivation;
}

export interface IDerivationChains {
    btc: IDerivationChainItemBtc;
}
