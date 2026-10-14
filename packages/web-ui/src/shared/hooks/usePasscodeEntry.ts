import { useEffect, useRef, useState } from 'react';

import { PASSCODE_LENGTH, useSubmitWhenComplete } from '@safely/ux';

const CODE_VISIBLE_MS = 300;

export type PasscodeEntry = {
    value: string;
    length: number;
    isLong: boolean;
    setValue: (value: string) => void;
    setIsLong: (isLong: boolean) => void;
};

export function usePasscodeEntry(onSubmit: (code: string) => void): PasscodeEntry {
    const [value, setValue] = useState('');
    const [length, setLength] = useState<number>(PASSCODE_LENGTH.short);
    const clearTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(clearTimer.current), []);

    useSubmitWhenComplete({
        value,
        length,
        onComplete: entered => {
            onSubmit(entered);
            clearTimer.current = setTimeout(() => setValue(''), CODE_VISIBLE_MS);
        }
    });

    const setIsLong = (isLong: boolean): void => {
        clearTimeout(clearTimer.current);
        setValue('');
        setLength(isLong ? PASSCODE_LENGTH.long : PASSCODE_LENGTH.short);
    };

    return { value, length, isLong: length === PASSCODE_LENGTH.long, setValue, setIsLong };
}
