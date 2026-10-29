import { useMemo } from 'react';

import type { SendFormEvent } from '../machine/types';
import type { AmountInputType, SendSuggestions } from '../types';

type Send = (event: SendFormEvent) => void;

export interface SendFormDispatchers {
    setRecipient: (value: string) => void;
    setAddressBookName: (name: string) => void;
    setAmount: (value: string) => void;
    pasteAmount: (raw: string) => void;
    setAmountInputType: (value: AmountInputType) => void;
    setAsset: (assetId: string) => void;
    setMemo: (value: string) => void;
    enterMax: () => void;
    exitMax: () => void;
    selectSuggestion: (id: string, visible: SendSuggestions) => void;
    goPrev: () => void;
    goNext: () => void;
    backToEditing: () => void;
}

export function useSendFormDispatchers(send: Send): SendFormDispatchers {
    return useMemo<SendFormDispatchers>(
        () => ({
            setRecipient: value => send({ type: 'SET_RECIPIENT', value }),
            setAddressBookName: name => send({ type: 'SET_ADDRESS_BOOK_NAME', name }),
            setAmount: value => send({ type: 'SET_AMOUNT', value }),
            pasteAmount: raw => send({ type: 'PASTE_AMOUNT', raw }),
            setAmountInputType: value => send({ type: 'SET_AMOUNT_INPUT_TYPE', value }),
            setAsset: assetId => send({ type: 'SET_ASSET', assetId }),
            setMemo: value => send({ type: 'SET_MEMO', value }),
            enterMax: () => send({ type: 'ENTER_MAX' }),
            exitMax: () => send({ type: 'EXIT_MAX' }),
            selectSuggestion: (id, visible) => send({ type: 'SELECT_SUGGESTION', id, visible }),
            goPrev: () => send({ type: 'PREV' }),
            goNext: () => send({ type: 'NEXT' }),
            backToEditing: () => send({ type: 'BACK_TO_EDITING' })
        }),
        [send]
    );
}
