import { useCallback, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';
import { StyleSheet } from 'react-native-unistyles';

import { SecurityCheckCancelledError } from '@safely/ux';

import {
    useLockScreenControl,
    usePasscode,
    usePasscodeLockout,
    usePasscodePrompt
} from '@mobile/entities/security';

import { LockContent } from './LockContent';
import { PasscodePromptContent } from './PasscodePromptContent';

const OverlayComponent = Platform.OS === 'ios' ? FullWindowOverlay : View;

const noop = (): void => undefined;

export const LockOverlay = () => {
    const { isLocked, unlock } = useLockScreenControl();
    const { isSet: hasPasscode } = usePasscode();
    const { hasLockedOut, resetAttempts } = usePasscodeLockout();
    const { request, close } = usePasscodePrompt();

    const isLockoutPending = hasLockedOut && hasPasscode;

    const handleUnlock = useCallback(() => {
        unlock();
        void resetAttempts();
    }, [unlock, resetAttempts]);

    const handleVerified = useCallback(() => {
        if (request === null) {
            return;
        }

        request.resolve();
        close(request.id);
    }, [request, close]);

    const handleCancel = useCallback(() => {
        if (request === null) {
            return;
        }

        request.reject(new SecurityCheckCancelledError());
        close(request.id);
    }, [request, close]);

    useEffect(() => {
        if (request !== null && !hasPasscode) {
            handleCancel();
        }
    }, [request, hasPasscode, handleCancel]);

    if (!isLocked && request === null && !isLockoutPending) {
        return null;
    }

    const content = isLocked ? (
        <LockContent key="lock" onUnlock={handleUnlock} />
    ) : request !== null ? (
        <PasscodePromptContent
            key={request.id}
            title={request.title}
            subtitle={request.subtitle}
            onVerified={handleVerified}
            onCancel={handleCancel}
        />
    ) : (
        <PasscodePromptContent key="lockout" onVerified={noop} onCancel={noop} />
    );

    return (
        <OverlayComponent style={StyleSheet.absoluteFill}>
            <GestureHandlerRootView style={StyleSheet.absoluteFill}>
                {content}
            </GestureHandlerRootView>
        </OverlayComponent>
    );
};
