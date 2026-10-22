import type { SPortfolioFlameDevnetId } from '@safely/sync-storage';
import { portfolioFlameDevnetIdToString } from '@safely/sync-storage';

import type { IPortfolioId } from './I-portfolio';
import { PortfolioNetworkType } from './portfolio-network-type';
import { sha256PrefixString } from '../../utils';
import { Id } from '../../utils/id';
import type { IMnemonicAccessor } from '../mnemonic';

export class PortfolioIdFlameDevnet extends Id implements IPortfolioId {
    public static create(mnemonicAccessor: IMnemonicAccessor): PortfolioIdFlameDevnet {
        const mnemonicHash = sha256PrefixString(
            `safely/v1/portfolio-id/devnet/${mnemonicAccessor.value.join(' ').toLowerCase()}`,
            16
        );
        return new PortfolioIdFlameDevnet({ mnemonicHash });
    }

    public readonly network = PortfolioNetworkType.TESTNET;

    private readonly mnemonicHash: string;

    constructor(serialized: SPortfolioFlameDevnetId) {
        super();

        this.mnemonicHash = serialized.mnemonicHash;
    }

    public toString(): string {
        return portfolioFlameDevnetIdToString(this.toJSON());
    }

    public toJSON(): SPortfolioFlameDevnetId {
        return { mnemonicHash: this.mnemonicHash };
    }
}
