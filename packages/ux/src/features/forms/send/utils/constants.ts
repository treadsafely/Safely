import type { BtcAsset, Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME, BTC_ASSET } from '@safely/core';

export const BLOCKCHAIN_DEFAULT_TOKENS: Record<Recipient['blockchain'], BtcAsset> = {
    [BLOCKCHAIN_NAME.BTC]: BTC_ASSET
};

export const DEFAULT_FIAT_DECIMALS = 2;

export const MIN_RECIPIENT_ADDRESS_LENGTH = 5;
