import { BLOCKCHAIN_NAME } from './blockchain-name';
import { assertUnreachable } from '../../utils';

export enum VM_TYPE {
    BTC = 'BTC',
    FLAME = 'FLAME'
}

export function vmTypeByBlockchainName(blockchainName: BLOCKCHAIN_NAME): VM_TYPE {
    switch (blockchainName) {
        case BLOCKCHAIN_NAME.BTC:
            return VM_TYPE.BTC;
        case BLOCKCHAIN_NAME.FLAME:
            return VM_TYPE.FLAME;
        default:
            assertUnreachable(blockchainName);
    }
}
