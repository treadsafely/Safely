import type { FlameAsset } from '../../entities';
import type { TransactionFeeCrypto } from '../shared';

export type FlameSendRequest = {
    recipientAddress: string;
    amount: bigint;
    isMax: boolean;
    memo: string;
};

export type FlameEstimation = {
    fee: TransactionFeeCrypto<FlameAsset>;
};
