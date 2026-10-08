import * as z from 'zod';

import { ASSET_ID_DOMAIN, ASSET_TYPE } from './I-asset';
import type { ICryptoAsset, ICryptoAssetId } from './I-crypto-asset';
import { NATIVE_CRYPTO_ASSET_ID_DOMAIN, sCryptoAssetBase } from './I-crypto-asset';
import { Id } from '../../utils/id';
import { BLOCKCHAIN_NAME } from '../blockchain/blockchain-name';

export const sFlameAssetId = z
    .object({
        type: z.literal(ASSET_TYPE.CRYPTO),
        blockchain: z.literal(BLOCKCHAIN_NAME.FLAME)
    })
    .transform(_ => new FlameAssetId());
export class FlameAssetId extends Id implements ICryptoAssetId {
    public readonly type = ASSET_TYPE.CRYPTO;

    public readonly blockchain = BLOCKCHAIN_NAME.FLAME;

    public toString(): string {
        return this.of(ASSET_ID_DOMAIN, this.type, this.blockchain, NATIVE_CRYPTO_ASSET_ID_DOMAIN);
    }

    public toJSON(): z.input<typeof sFlameAssetId> {
        return {
            type: this.type,
            blockchain: this.blockchain
        };
    }
}

export const sFlameAsset = z.intersection(
    z.object({
        id: sFlameAssetId
    }),
    sCryptoAssetBase
);
export interface IFlameAsset extends ICryptoAsset {
    id: FlameAssetId;
}

export const FLAME_ASSET: IFlameAsset = {
    id: new FlameAssetId(),
    symbol: 'FLM',
    name: 'Flame',
    decimals: 8
};

export type FlameAsset = IFlameAsset;
