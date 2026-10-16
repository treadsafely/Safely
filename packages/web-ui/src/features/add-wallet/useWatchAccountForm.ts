import { useState } from 'react';

import { BtcAddress, BtcXpub } from '@safely/core';

const ERROR_VISIBLE_LENGTH = 20;

export type WatchAccountFormState = {
    value: string;
    input: string;
    isValid: boolean;
    hasError: boolean;
    errorKey:
        'addWallet.watchAccount.unsupportedExtendedKey' | 'addWallet.watchAccount.invalidAddress';
    setValue: (value: string) => void;
};

export function useWatchAccountForm(): WatchAccountFormState {
    const [value, setValue] = useState('');

    const input = value.trim();
    const isValidXpub = BtcXpub.validate(input);
    const isSupportedXpub = isValidXpub && /^[XxZz]pub/.test(input);
    const isValid = BtcAddress.validate(input) || isSupportedXpub;

    return {
        value,
        input,
        isValid,
        hasError: !isValid && input.length >= ERROR_VISIBLE_LENGTH,
        errorKey: isValidXpub
            ? 'addWallet.watchAccount.unsupportedExtendedKey'
            : 'addWallet.watchAccount.invalidAddress',
        setValue
    };
}
