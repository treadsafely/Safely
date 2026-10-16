import { useCallback, useEffect, useRef, useState } from 'react';

import type { PasscodeLength } from '@safely/ux';
import { useSubmitWhenComplete } from '@safely/ux';

const CODE_VISIBLE_MS = 300;

export type PasscodeEntryParams = {
    length: PasscodeLength;
    isInvalid?: boolean;
    onSubmit: (code: string) => void;
    onInvalidCleared?: () => void;
};

export type PasscodeEntry = {
    value: string;
    setValue: (value: string) => void;
};

export function usePasscodeEntry(params: PasscodeEntryParams): PasscodeEntry {
    const { length, isInvalid, onSubmit, onInvalidCleared } = params;

    const [value, setValue] = useState('');
    const [enteredLength, setEnteredLength] = useState<PasscodeLength>(length);

    const submitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const clearTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const invalidCleared = useRef(onInvalidCleared);
    invalidCleared.current = onInvalidCleared;

    if (enteredLength !== length) {
        setEnteredLength(length);
        setValue('');
    }

    useEffect(() => {
        clearTimeout(submitTimer.current);
    }, [length]);

    useEffect(
        () => () => {
            clearTimeout(submitTimer.current);
            clearTimeout(clearTimer.current);
        },
        []
    );

    useEffect(() => {
        if (!isInvalid) {
            return;
        }

        clearTimer.current = setTimeout(() => {
            setValue('');
            invalidCleared.current?.();
        }, CODE_VISIBLE_MS);

        return () => clearTimeout(clearTimer.current);
    }, [isInvalid]);

    useSubmitWhenComplete({
        value,
        length,
        onComplete: entered => {
            clearTimeout(submitTimer.current);
            submitTimer.current = setTimeout(() => onSubmit(entered), CODE_VISIBLE_MS);
        }
    });

    const change = useCallback(
        (next: string) => setValue(current => (current.length < length ? next : current)),
        [length]
    );

    return { value, setValue: change };
}
