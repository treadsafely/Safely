import type { FC, PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useEnteredBackground } from '@safely/ux';

import { useLockScreenQuery } from './useLockScreen';
import { usePasscode } from './usePasscode';

interface LockScreenContextValue {
    isLocked: boolean;
    unlock: () => void;
}

const LockScreenContext = createContext<LockScreenContextValue | undefined>(undefined);

export function useLockScreenControl() {
    const context = useContext(LockScreenContext);

    if (!context) {
        throw new Error('useLockScreenControl must be used within LockScreenProvider');
    }

    return context;
}

export const LockScreenProvider: FC<PropsWithChildren> = ({ children }) => {
    const { isSet: hasPasscode } = usePasscode();
    const { data: isLockScreenEnabled } = useLockScreenQuery();

    const isEnabled = isLockScreenEnabled && hasPasscode;
    const [isLockRequested, setIsLockRequested] = useState(isEnabled);

    useEnteredBackground(() => {
        if (isEnabled) {
            setIsLockRequested(true);
        }
    });

    const unlock = useCallback(() => {
        setIsLockRequested(false);
    }, []);

    const value = useMemo(
        () => ({ isLocked: isLockRequested && isEnabled, unlock }),
        [isEnabled, isLockRequested, unlock]
    );

    return <LockScreenContext value={value}>{children}</LockScreenContext>;
};
