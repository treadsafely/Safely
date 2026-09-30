import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import {
    SecurityCheckCancelledError,
    useAppState,
    useEnteredBackground,
    useEraseAllData,
    useLoader
} from '@safely/ux';
import { EraseDataModal, LockScreen, PasscodeVerification } from '@safely/web-ui';

import { useLockScreen } from './useLockScreen';
import { isBiometryPromptOpen } from '../biometry';
import { usePasscode, usePasscodePromptStore, usePasscodeVerification } from '../passcode';

export type AppLockProps = {
    children: ReactNode;
};

export const AppLock: FC<AppLockProps> = ({ children }) => {
    const passcode = usePasscode();
    const lockScreen = useLockScreen();

    const isEnabled = passcode.isSet && lockScreen.isEnabled;
    const [isLocked, setIsLocked] = useState(isEnabled);

    useEnteredBackground(() => {
        if (isEnabled && !isBiometryPromptOpen()) {
            setIsLocked(true);
        }
    });

    if (passcode.isSet && isLocked) {
        return <AppLockScreen onUnlocked={() => setIsLocked(false)} />;
    }

    return (
        <>
            {children}
            {passcode.isSet && <PasscodePromptOverlay />}
        </>
    );
};

type AppLockScreenProps = {
    onUnlocked: () => void;
};

/* signing out properly needs the keys this screen is guarding, so the only way out is erasing */
const AppLockScreen: FC<AppLockScreenProps> = props => {
    const { withLoader } = useLoader();
    const { mutateAsync: eraseAllData } = useEraseAllData();
    const [isErasing, setIsErasing] = useState(false);
    const isAppSettled = useSettledActiveAppState();

    const verification = usePasscodeVerification({
        onVerified: props.onUnlocked,
        hasBiometryAutoPrompt: isAppSettled
    });

    return (
        <>
            <LockScreen
                value={verification.value}
                length={verification.length}
                isInvalid={verification.isInvalid}
                isLocked={verification.isLocked}
                remainingSeconds={verification.remainingSeconds}
                onCheckBiometry={verification.promptBiometry}
                onChange={verification.onChange}
                onSignOut={() => setIsErasing(true)}
            />

            {isErasing && (
                <EraseDataModal
                    onConfirm={() => void withLoader(() => eraseAllData())}
                    onClose={() => setIsErasing(false)}
                />
            )}
        </>
    );
};

/* the window takes the focus back when the space finishes sliding, and it would take it from a Touch ID prompt opened mid-swipe */
const SPACE_SWITCH_SETTLE_MS = 750;

function useSettledActiveAppState(): boolean {
    const { current } = useAppState();
    const [isSettled, setIsSettled] = useState(false);

    useEffect(() => {
        if (current !== 'active') {
            setIsSettled(false);
            return;
        }

        const timer = setTimeout(() => setIsSettled(true), SPACE_SWITCH_SETTLE_MS);

        return () => clearTimeout(timer);
    }, [current]);

    return isSettled;
}

const PasscodePromptOverlay: FC = () => {
    const request = usePasscodePromptStore(state => state.request);
    const close = usePasscodePromptStore(state => state.close);

    if (request === null) {
        return null;
    }

    return (
        <PasscodePromptScreen
            title={request.title}
            subtitle={request.subtitle}
            onVerified={() => {
                request.resolve();
                close();
            }}
            onCancel={() => {
                request.reject(new SecurityCheckCancelledError());
                close();
            }}
        />
    );
};

type PasscodePromptScreenProps = {
    title?: string;
    subtitle?: string;
    onVerified: () => void;
    onCancel: () => void;
};

const PasscodePromptScreen: FC<PasscodePromptScreenProps> = props => {
    const verification = usePasscodeVerification({ onVerified: props.onVerified });

    return (
        <PasscodeVerification
            title={props.title}
            subtitle={props.subtitle}
            value={verification.value}
            length={verification.length}
            isInvalid={verification.isInvalid}
            isLocked={verification.isLocked}
            remainingSeconds={verification.remainingSeconds}
            onCheckBiometry={verification.promptBiometry}
            onChange={verification.onChange}
            onCancel={props.onCancel}
        />
    );
};
