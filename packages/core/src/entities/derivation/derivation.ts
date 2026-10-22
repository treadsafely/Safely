import {
    type SDerivation,
    type SLedgerDerivation,
    sDerivation,
    sLedgerDerivation
} from '@safely/sync-storage';

import type { IPortfolioBase } from '../portfolio';
import { DerivationId } from './derivation-id';
import type {
    DerivationMeta,
    IDerivation,
    IDerivationChains,
    ILedgerDerivation
} from './I-derivation';

export class Derivation implements IDerivation {
    public readonly id: DerivationId;

    public readonly chains: IDerivationChains;

    public get index(): number {
        return this.id.derivationIndex;
    }

    constructor(
        public portfolioRef: IPortfolioBase,
        index: number,
        chains: IDerivationChains | ((self: Derivation) => IDerivationChains)
    ) {
        this.id = new DerivationId(this.portfolioRef.id, index);
        this.chains = typeof chains === 'function' ? chains(this) : chains;
    }

    public toJSON(): SDerivation {
        return sDerivation.toJson({
            index: this.index,
            chains: derivationChainsToJSON(this.chains)
        });
    }
}

export class LedgerDerivation extends Derivation implements ILedgerDerivation {
    public readonly meta: DerivationMeta;

    constructor(
        portfolioRef: IPortfolioBase,
        index: number,
        chains: IDerivationChains | ((self: Derivation) => IDerivationChains),
        meta: DerivationMeta
    ) {
        super(portfolioRef, index, chains);
        this.meta = meta;
    }

    public override toJSON(): SLedgerDerivation {
        return sLedgerDerivation.toJson({
            index: this.index,
            meta: this.meta,
            chains: derivationChainsToJSON(this.chains)
        });
    }
}

export function isLedgerDerivation(derivation: IDerivation): derivation is ILedgerDerivation {
    return derivation instanceof LedgerDerivation;
}

function derivationChainsToJSON(chains: IDerivationChains): SDerivation['chains'] {
    return {
        btc: chains.btc.toJSON()
    };
}
