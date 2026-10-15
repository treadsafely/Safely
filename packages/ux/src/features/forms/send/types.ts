import type {
    BLOCKCHAIN_NAME,
    BtcAsset,
    FlameAsset,
    ContactMeta,
    CryptoAsset,
    CryptoAssetAmount,
    FiatAssetAmount,
    PortfolioMeta,
    RatedCryptoAssetAmount,
    Recipient
} from '@safely/core';

export type RecipientMeta =
    | { kind: 'portfolio'; meta: PortfolioMeta; tag?: number }
    | { kind: 'contact'; meta: ContactMeta };

export interface PortfolioSuggestion {
    id: string;
    address: string;
    meta: PortfolioMeta;
    tag?: number;
    isWatchOnly?: boolean;
}

export interface ContactSuggestion {
    id: string;
    address: string;
    meta: ContactMeta;
}

export type SendSuggestions = {
    portfolios: PortfolioSuggestion[];
    contacts: ContactSuggestion[];
};

export type AmountInputType = 'crypto' | 'fiat';

export type AmountCryptoFirst<C extends CryptoAsset> = {
    inputType: 'crypto';
    cryptoAssetAmount: CryptoAssetAmount<C>;
    fiatAssetAmount: FiatAssetAmount;
};

export type AmountFiatFirst<C extends CryptoAsset> = {
    inputType: 'fiat';
    cryptoAssetAmount: CryptoAssetAmount<C>;
    fiatAssetAmount: FiatAssetAmount;
};

export type AmountWithInputType<C extends CryptoAsset> = AmountCryptoFirst<C> | AmountFiatFirst<C>;

export interface AmountValidationResult {
    formatted: string;
    parsed: AmountWithInputType<CryptoAsset> | undefined;
    error: string | undefined;
}

export interface AmountWithOutputType<C extends CryptoAsset = CryptoAsset> {
    formatted: string;
    parsed: AmountWithInputType<C>;
}

export type SendFormResultBtc = {
    blockchain: BLOCKCHAIN_NAME.BTC;
    recipient: Recipient;
    amount: AmountWithInputType<BtcAsset>;
    isMax: boolean;
    recipientMeta?: RecipientMeta;
};

export type SendFormResultFlame = {
    blockchain: BLOCKCHAIN_NAME.FLAME;
    recipient: Recipient;
    amount: AmountWithInputType<FlameAsset>;
    isMax: boolean;
    memo: string;
    recipientMeta?: RecipientMeta;
};

export type SendFormResult = SendFormResultBtc | SendFormResultFlame;

export enum FormStepNames {
    RECIPIENT = 'recipient',
    ASSET_AMOUNT = 'assetAmount'
}

export const SEND_STEPS = [FormStepNames.RECIPIENT, FormStepNames.ASSET_AMOUNT] as const;
export type SendStepId = (typeof SEND_STEPS)[number];

export interface SendFormInitialValues {
    recipient?: string;
    addressBookName?: string;
    amount?: string;
    amountInputType?: AmountInputType;
}

export interface SendFormValues {
    recipient: string;
    addressBookName: string;
    amount: string;
    amountInputType: AmountInputType;
    isMax: boolean;
    assetId: string;
    memo: string;
}

export interface SendFormParsed {
    recipient: Recipient | undefined;
    amount: AmountWithInputType<CryptoAsset> | undefined;
    asset: RatedCryptoAssetAmount | undefined;
    isMax: boolean;
}

export interface SendFormErrors {
    recipient: string | undefined;
    amount: string | undefined;
    asset: string | undefined;
}

export enum SuggestionSource {
    USER_DEFINED = 'user-defined',
    SUGGESTIONS = 'suggestions'
}

export interface SendSuggestionState {
    selectedId: string | undefined;
    portfoliosIds: string[] | undefined;
    contactsIds: string[] | undefined;
    source: SuggestionSource | undefined;
}
