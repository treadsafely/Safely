import { Id } from '../../../utils/id';
import { BLOCKCHAIN_NAME } from '../../blockchain/blockchain-name';

export class FlameWalletId extends Id {
    public readonly blockchain = BLOCKCHAIN_NAME.FLAME;

    constructor(private readonly ownerId: string | Id) {
        super();
    }

    public toString(): string {
        return this.of(this.ownerId, 'wallet', this.blockchain);
    }
}
