import type { CryptoAsset, Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME, BTC_ASSET, FLAME_ASSET } from '@safely/core';

export const BLOCKCHAIN_DEFAULT_TOKENS: Record<Recipient['blockchain'], CryptoAsset> = {
    [BLOCKCHAIN_NAME.BTC]: BTC_ASSET,
    [BLOCKCHAIN_NAME.FLAME]: FLAME_ASSET
};

export const SEND_FORM_FEATURES_BY_CHAIN: Record<
    Recipient['blockchain'],
    { hasMemo: boolean; canSaveContact: boolean }
> = {
    [BLOCKCHAIN_NAME.BTC]: { hasMemo: false, canSaveContact: true },
    // contacts restore every address as BTC, so a Flame one would come back on the wrong chain
    [BLOCKCHAIN_NAME.FLAME]: { hasMemo: true, canSaveContact: false }
};

export const DEFAULT_FIAT_DECIMALS = 2;

export const MIN_RECIPIENT_ADDRESS_LENGTH = 5;
