import { z } from 'zod';

import type { BtcAssetId, BtcAsset } from './btc-asset';
import { sBtcAsset, sBtcAssetId } from './btc-asset';
import type { FlameAsset, FlameAssetId } from './flame-asset';
import { sFlameAsset, sFlameAssetId } from './flame-asset';
import type { IAsset } from './I-asset';
import { ASSET_TYPE } from './I-asset';

export const sCryptoAsset = z.union([sBtcAsset, sFlameAsset]);
export type CryptoAsset = BtcAsset | FlameAsset;

export const sCryptoAssetId = z.union([sBtcAssetId, sFlameAssetId]);
export type CryptoAssetId = BtcAssetId | FlameAssetId;

export function isCryptoAsset(asset: IAsset): asset is CryptoAsset {
    return 'type' in asset.id && asset.id.type === ASSET_TYPE.CRYPTO;
}
