import type {
    Contact,
    CryptoAssetAmount,
    CryptoAsset,
    NumberFormatter,
    PortfolioNetworkType,
    RatedCryptoAssetAmount,
    Recipient
} from '@safely/core';

import type {
    AmountInputType,
    AmountWithInputType,
    ContactSuggestion,
    OwnAddresses,
    PortfolioSuggestion,
    SendFormErrors,
    SendFormInitialValues,
    SendFormResult,
    SendFormValues,
    SendSuggestionState,
    SendSuggestions
} from '../types';

export interface CreateContactInput {
    name: string;
    addresses: {
        address: string;
        blockchain: Recipient['blockchain'];
    }[];
}

export type FetchMaxValue = (recipient: Recipient) => Promise<CryptoAssetAmount | undefined>;

export type ActiveWallet = Pick<PortfolioSuggestion, 'id' | 'meta'>;

export interface SendFormMachineInput {
    resolvedInitialValues: SendFormInitialValues | undefined;
    formatter: NumberFormatter;

    portfolioSuggestions: PortfolioSuggestion[];
    contactSuggestions: ContactSuggestion[];
    ratedAssets: RatedCryptoAssetAmount[];
    activeWallet: ActiveWallet;
    ownAddresses: OwnAddresses;
    networkType: PortfolioNetworkType;

    shouldResetForm: () => boolean;
    onSubmit: (result: SendFormResult, onSuccess: () => void) => void;
    createContact: (input: CreateContactInput) => Promise<Contact>;
    fetchMaxValue: FetchMaxValue;
    persistAmountInputType: (type: AmountInputType) => void;
    initialAmountInputType: AmountInputType;
}

export interface SendFormMachineContext {
    values: SendFormValues;
    parsed: {
        recipient: Recipient | undefined;
        amount: AmountWithInputType<CryptoAsset> | undefined;
        asset: RatedCryptoAssetAmount | undefined;
        maxValue: CryptoAssetAmount | undefined;
    };
    errors: SendFormErrors;
    suggestion: SendSuggestionState;

    formatter: NumberFormatter;

    portfolioSuggestions: PortfolioSuggestion[];
    contactSuggestions: ContactSuggestion[];
    ratedAssets: RatedCryptoAssetAmount[];
    activeWallet: ActiveWallet;
    ownAddresses: OwnAddresses;
    networkType: PortfolioNetworkType;

    shouldResetForm: SendFormMachineInput['shouldResetForm'];
    onSubmit: SendFormMachineInput['onSubmit'];
    createContact: SendFormMachineInput['createContact'];
    fetchMaxValue: FetchMaxValue;
    persistAmountInputType: SendFormMachineInput['persistAmountInputType'];
    initialAmountInputType: SendFormMachineInput['initialAmountInputType'];
}

export type SendFormEvent =
    | { type: 'SET_RECIPIENT'; value: string }
    | { type: 'SET_ADDRESS_BOOK_NAME'; name: string }
    | { type: 'SELECT_SUGGESTION'; id: string; visible: SendSuggestions }
    | { type: 'SET_AMOUNT'; value: string }
    | { type: 'PASTE_AMOUNT'; raw: string }
    | { type: 'SET_AMOUNT_INPUT_TYPE'; value: AmountInputType }
    | { type: 'SET_ASSET'; assetId: string }
    | { type: 'SET_MEMO'; value: string }
    | { type: 'ENTER_MAX' }
    | { type: 'EXIT_MAX' }
    | { type: 'NEXT' }
    | { type: 'PREV' }
    | { type: 'BACK_TO_EDITING' }
    | { type: 'RESET' };
