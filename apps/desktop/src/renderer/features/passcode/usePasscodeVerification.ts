import { useCallback, useEffect, useRef, useState } from 'react';

import { useSubmitWhenComplete } from '@safely/ux';

import { usePasscode } from './usePasscode';
import { usePasscodeLockout } from './usePasscodeLockout';
import { authenticateBiometry, useBiometryQuery } from '../biometry';

const CODE_VISIBLE_MS = 300;

interface UsePasscodeVerificationParams {
    onVerified: () => void;
    /* only the lock screen opens on its own; reaching the gate's prompt means the factor was refused */
    hasBiometryAutoPrompt?: boolean;
}

export interface UsePasscodeVerificationResult {
    value: string;
    length: number;
    isInvalid: boolean;
    isSuccess: boolean;
    isLocked: boolean;
    hasLockedOut: boolean;
    remainingSeconds: number;
    promptBiometry: (() => void) | undefined;
    onChange: (value: string) => void;
}

export function usePasscodeVerification(
    params: UsePasscodeVerificationParams
): UsePasscodeVerificationResult {
    const { onVerified, hasBiometryAutoPrompt = false } = params;

    const passcode = usePasscode();
    const { data: biometry } = useBiometryQuery();
    const { isLocked, hasLockedOut, remainingSeconds, recordFailure, reset } = usePasscodeLockout();

    const [value, setValue] = useState('');
    const [isInvalid, setIsInvalid] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const isSettledRef = useRef(false);
    const isVerifyingRef = useRef(false);
    const hasAutoPromptedRef = useRef(false);
    const invalidTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const successTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(invalidTimerRef.current), []);

    const length = passcode.length ?? 0;

    const verified = useCallback(() => {
        if (isSettledRef.current) {
            return;
        }

        isSettledRef.current = true;
        onVerified();
    }, [onVerified]);

    const onChange = useCallback(
        (next: string) => {
            if (isSuccess || isInvalid) {
                return;
            }

            setValue(next);
        },
        [isSuccess, isInvalid]
    );

    /* dropping this reset accumulates mistypes across sessions until the lockout hides the factor */
    const promptBiometry = useCallback(() => {
        void authenticateBiometry().then(async isAuthenticated => {
            if (!isAuthenticated) {
                return;
            }

            await reset();
            verified();
        });
    }, [reset, verified]);

    const onEntered = useCallback(
        (entered: string) => {
            if (!passcode.isSet || isVerifyingRef.current) {
                return;
            }

            isVerifyingRef.current = true;

            void (async () => {
                try {
                    if (await passcode.validate(entered)) {
                        setIsSuccess(true);
                        successTimerRef.current = setTimeout(() => {
                            void reset().then(verified);
                        }, CODE_VISIBLE_MS);
                        return;
                    }

                    if (isSettledRef.current) {
                        return;
                    }

                    setIsInvalid(true);
                    try {
                        await recordFailure();
                    } finally {
                        invalidTimerRef.current = setTimeout(() => {
                            setValue('');
                            setIsInvalid(false);
                        }, CODE_VISIBLE_MS);
                    }
                } finally {
                    isVerifyingRef.current = false;
                }
            })();
        },
        [passcode.isSet, passcode.validate, verified, recordFailure, reset]
    );

    useSubmitWhenComplete({ value, length, onComplete: onEntered });

    useEffect(() => {
        if (
            !hasBiometryAutoPrompt ||
            hasAutoPromptedRef.current ||
            isLocked ||
            !biometry?.isEnabled
        ) {
            return;
        }

        hasAutoPromptedRef.current = true;
        promptBiometry();
    }, [hasBiometryAutoPrompt, isLocked, biometry?.isEnabled, promptBiometry]);

    return {
        value,
        length,
        isInvalid,
        isSuccess,
        isLocked,
        hasLockedOut,
        remainingSeconds,
        promptBiometry: biometry?.isEnabled ? promptBiometry : undefined,
        onChange
    };
}
