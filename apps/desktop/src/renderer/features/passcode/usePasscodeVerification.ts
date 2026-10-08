import { useCallback, useEffect, useRef, useState } from 'react';

import { useSubmitWhenComplete } from '@safely/ux';

import { usePasscode } from './usePasscode';
import { usePasscodeLockout } from './usePasscodeLockout';
import { authenticateBiometry, useBiometryQuery } from '../biometry';

interface UsePasscodeVerificationParams {
    onVerified: () => void;
    /* only the lock screen opens on its own; reaching the gate's prompt means the factor was refused */
    hasBiometryAutoPrompt?: boolean;
}

export interface UsePasscodeVerificationResult {
    value: string;
    length: number;
    isInvalid: boolean;
    isLocked: boolean;
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
    const { isLocked, remainingSeconds, recordFailure, reset } = usePasscodeLockout();

    const [value, setValue] = useState('');
    const [isInvalid, setIsInvalid] = useState(false);
    const isSettledRef = useRef(false);
    const hasAutoPromptedRef = useRef(false);

    const length = passcode.length ?? 0;

    const verified = useCallback(() => {
        if (isSettledRef.current) {
            return;
        }

        isSettledRef.current = true;
        onVerified();
    }, [onVerified]);

    const onChange = useCallback((next: string) => {
        setIsInvalid(false);
        setValue(next);
    }, []);

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
            if (!passcode.isSet) {
                return;
            }

            setValue('');

            void passcode.validate(entered).then(async isValid => {
                if (isValid) {
                    await reset();
                    verified();
                    return;
                }

                if (isSettledRef.current) {
                    return;
                }

                setIsInvalid(true);
                await recordFailure();
            });
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
        isLocked,
        remainingSeconds,
        promptBiometry: biometry?.isEnabled ? promptBiometry : undefined,
        onChange
    };
}
