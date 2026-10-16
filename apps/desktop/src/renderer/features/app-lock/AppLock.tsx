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

import { guardedStyles } from './AppLock.styles';
import { useLockScreen } from './useLockScreen';
import { isBiometryPromptOpen } from '../biometry';
import {
    usePasscode,
    usePasscodeLockout,
    usePasscodePromptStore,
    usePasscodeVerification
} from '../passcode';

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

    if (!passcode.isSet) {
        return children;
    }

    return <PasscodePromptOverlay>{children}</PasscodePromptOverlay>;
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
                isSuccess={verification.isSuccess}
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

const noop = (): void => undefined;

type PasscodePromptOverlayProps = {
    children: ReactNode;
};

const PasscodePromptOverlay: FC<PasscodePromptOverlayProps> = ({ children }) => {
    const request = usePasscodePromptStore(state => state.request);
    const close = usePasscodePromptStore(state => state.close);
    const { hasLockedOut } = usePasscodeLockout();
    const isAppSettled = useSettledActiveAppState();

    const isOpen = request !== null || hasLockedOut;

    return (
        <>
            <div inert={isOpen} className={guardedStyles}>
                {children}
            </div>

            {request !== null ? (
                <PasscodePromptScreen
                    key="request"
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
            ) : (
                hasLockedOut && (
                    <PasscodePromptScreen
                        key="lockout"
                        hasBiometryAutoPrompt={isAppSettled}
                        onVerified={noop}
                        onCancel={noop}
                    />
                )
            )}
        </>
    );
};

type PasscodePromptScreenProps = {
    title?: string;
    subtitle?: string;
    hasBiometryAutoPrompt?: boolean;
    onVerified: () => void;
    onCancel: () => void;
};

const PasscodePromptScreen: FC<PasscodePromptScreenProps> = props => {
    const { title, subtitle, hasBiometryAutoPrompt, onVerified, onCancel } = props;

    const { withLoader } = useLoader();
    const { mutateAsync: eraseAllData } = useEraseAllData();
    const [isErasing, setIsErasing] = useState(false);
    const verification = usePasscodeVerification({ onVerified, hasBiometryAutoPrompt });

    return (
        <>
            <PasscodeVerification
                title={title}
                subtitle={subtitle}
                value={verification.value}
                length={verification.length}
                isInvalid={verification.isInvalid}
                isSuccess={verification.isSuccess}
                isLocked={verification.isLocked}
                hasLockedOut={verification.hasLockedOut}
                remainingSeconds={verification.remainingSeconds}
                onCheckBiometry={verification.promptBiometry}
                onChange={verification.onChange}
                onCancel={onCancel}
                onSignOut={() => setIsErasing(true)}
            />

            {isErasing && (
                <EraseDataModal
                    layer="passcodePrompt"
                    onConfirm={() => void withLoader(() => eraseAllData())}
                    onClose={() => setIsErasing(false)}
                />
            )}
        </>
    );
};
