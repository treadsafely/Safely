import type { ChangeEvent, ClipboardEvent } from 'react';
import { useLayoutEffect, useRef } from 'react';

import type { NumberFormatLocale } from '@safely/core';

import { resolveCaret, sanitizeAmount } from './amount-mask';

export type UseAmountInputParams = {
    amount: string;
    decimals: number;
    locale: NumberFormatLocale;
    onChange: (amount: string) => void;
    onPaste: (raw: string) => void;
};

export function useAmountInput(params: UseAmountInputParams) {
    const { amount, decimals, locale, onChange, onPaste } = params;

    const inputRef = useRef<HTMLInputElement>(null);
    const caret = useRef<number | null>(null);

    useLayoutEffect(() => {
        const input = inputRef.current;
        const offset = caret.current;

        if (input === null || offset === null) {
            return;
        }

        caret.current = null;
        input.setSelectionRange(offset, offset);
    }, [amount]);

    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const typed = event.target.value;
        const sanitized = sanitizeAmount(typed, { locale, decimals });

        caret.current = resolveCaret({
            typed,
            sanitized,
            caret: event.target.selectionStart ?? typed.length
        });

        onChange(sanitized);
    };

    const handlePaste = (event: ClipboardEvent<HTMLInputElement>): void => {
        event.preventDefault();
        onPaste(event.clipboardData.getData('text'));
    };

    return { inputRef, value: amount, onChange: handleChange, onPaste: handlePaste };
}
