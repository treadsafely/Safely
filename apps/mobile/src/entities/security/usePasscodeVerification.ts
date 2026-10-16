import {
    impactAsync,
    ImpactFeedbackStyle,
    notificationAsync,
    NotificationFeedbackType
} from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';

import { PASSCODE_LENGTH, useSubmitWhenComplete } from '@safely/ux';

import { usePasscode } from './usePasscode';
import { usePasscodeLockout } from './usePasscodeLockout';

interface UsePasscodeVerificationParams {
    onSuccess: () => void;
}

interface UsePasscodeVerificationResult {
    inputValue: string;
    digitsAmount: number;
    isSuccess: SharedValue<boolean>;
    isError: SharedValue<boolean>;
    isLocked: boolean;
    remainingSeconds: number;
    failedAttempts: number;
    handleInputChange: (value: string) => void;
}

export function usePasscodeVerification(
    params: UsePasscodeVerificationParams
): UsePasscodeVerificationResult {
    const { onSuccess } = params;

    const passcode = usePasscode();
    const { isLocked, remainingSeconds, failedAttempts, recordFailedAttempt, resetAttempts } =
        usePasscodeLockout();
    const processingRef = useRef(false);

    const [inputValue, setInputValue] = useState('');
    const isSuccess = useSharedValue(false);
    const isError = useSharedValue(false);

    const digitsAmount = passcode.isSet ? passcode.passcodeLength : PASSCODE_LENGTH.short;

    const handleInputChange = useCallback((value: string) => {
        void impactAsync(ImpactFeedbackStyle.Light);
        setInputValue(value);
    }, []);

    const handleComplete = useCallback(async () => {
        if (isSuccess.value || processingRef.current) return;
        processingRef.current = true;

        const isValid = passcode.isSet ? await passcode.validate(inputValue) : false;
        if (isValid) {
            await resetAttempts();
            await notificationAsync(NotificationFeedbackType.Success);
            isSuccess.value = true;

            setTimeout(onSuccess, 300);
        } else {
            await recordFailedAttempt();
            await notificationAsync(NotificationFeedbackType.Error);
            isError.value = true;

            setTimeout(() => {
                setInputValue('');
                isError.value = false;
                processingRef.current = false;
            }, 300);
        }
    }, [isSuccess, passcode, inputValue, resetAttempts, onSuccess, recordFailedAttempt, isError]);

    useSubmitWhenComplete({
        value: inputValue,
        length: digitsAmount,
        onComplete: () => void handleComplete()
    });

    return {
        inputValue,
        digitsAmount,
        isSuccess,
        isError,
        isLocked,
        remainingSeconds,
        failedAttempts,
        handleInputChange
    };
}
