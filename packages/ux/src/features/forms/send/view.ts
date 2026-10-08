import type {
    CryptoAsset,
    CryptoAssetAmount,
    PortfolioMeta,
    RatedCryptoAssetAmount,
    Recipient
} from '@safely/core';

import type {
    AmountInputType,
    AmountWithInputType,
    RecipientMeta,
    SendSuggestions,
    SuggestionSource
} from './types';

export type SendFormView =
    RestoringView | RecipientView | CreateContactView | AmountView | SubmittedView;

type RestoringView = {
    state: 'restoring';
};

type CreateContactView = {
    state: 'creatingContact';
};

interface RecipientViewBase {
    state: 'recipient';
    values: {
        recipient: string;
        addressBookName: string;
    };
    errors: {
        recipient: string | undefined;
    };
    suggestions: SendSuggestions;
    restoredSuggestions: SendSuggestions | undefined;
    selectedSuggestionId: string | undefined;
    selectedSuggestionSource: SuggestionSource | undefined;
    fromMeta: PortfolioMeta;
    setRecipient: (value: string) => void;
    setAddressBookName: (name: string) => void;
    selectSuggestion: (id: string, visible: SendSuggestions) => void;
}

type CanGoNext = { next: () => void };
type CanEnterMax = { enterMax?: () => void };
type CanExitMax = { exitMax: () => void };

export type RecipientView = RecipientViewBase &
    ({ status: 'empty' | 'invalid' | 'selfTransfer' } | ({ status: 'valid' } & CanGoNext));

interface AmountViewBase {
    state: 'amount';
    values: {
        amount: string;
        assetId: string;
        amountInputType: AmountInputType;
    };
    errors: {
        amount: string | undefined;
        asset: string | undefined;
    };
    parsed: {
        recipient: Recipient;
        amount: AmountWithInputType<CryptoAsset> | undefined;
        asset: RatedCryptoAssetAmount | undefined;
    };
    recipientMeta: RecipientMeta | undefined;
    fromMeta: PortfolioMeta;
    availableAssets: CryptoAssetAmount[];
    isMaxAvailable: boolean;
    setAmount: (value: string) => void;
    pasteAmount: (raw: string) => void;
    setAmountInputType: (type: AmountInputType) => void;
    setAsset: (id: string) => void;
    prev: () => void;
}

export type AmountView = AmountViewBase &
    (
        | ({ status: 'idle' | 'invalid' } & CanEnterMax)
        | ({ status: 'manual' } & CanEnterMax & CanGoNext)
        | ({ status: 'max' } & CanExitMax & CanGoNext)
    );

export interface SubmittedView {
    state: 'submitted';
    backToEditing: () => void;
}
