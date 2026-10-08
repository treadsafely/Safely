import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';

import type { PasscodeLength } from '@safely/ux';
import { PASSCODE_LENGTH } from '@safely/ux';

export interface PasscodeState {
    digitsAmount: PasscodeLength;
    switchDigitsAmount: () => void;
    inputValue: string;
    setInputValue: (value: string) => void;
    isSuccess: SharedValue<boolean>;
    isError: SharedValue<boolean>;
    reset: () => void;
}

export const usePasscodeState = (): PasscodeState => {
    const [digitsAmount, setDigitsAmount] = useState<PasscodeLength>(PASSCODE_LENGTH.short);
    const [inputValue, _setInputValue] = useState('');
    const isSuccess = useSharedValue<boolean>(false);
    const isError = useSharedValue<boolean>(false);

    const switchDigitsAmount = useCallback(() => {
        void impactAsync();
        _setInputValue('');
        isSuccess.value = false;
        isError.value = false;
        setDigitsAmount(prev =>
            prev === PASSCODE_LENGTH.short ? PASSCODE_LENGTH.long : PASSCODE_LENGTH.short
        );
    }, [isSuccess, isError]);

    const setInputValue = useCallback((value: string) => {
        impactAsync(ImpactFeedbackStyle.Light);
        _setInputValue(value);
    }, []);

    const reset = useCallback(() => {
        _setInputValue('');
        isSuccess.value = false;
        isError.value = false;
    }, [isSuccess, isError]);

    return useMemo(
        () => ({
            digitsAmount,
            switchDigitsAmount,
            inputValue,
            setInputValue,
            isSuccess,
            isError,
            reset
        }),
        [digitsAmount, switchDigitsAmount, inputValue, setInputValue, isSuccess, isError, reset]
    );
};
