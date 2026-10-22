import type { FC, ReactNode } from 'react';
import { createContext, useCallback, useRef } from 'react';

export type ScreenProtectionHandle = {
    acquire: () => () => void;
};

export const ScreenProtectionContext = createContext<ScreenProtectionHandle | null>(null);

export type ScreenProtectionProviderProps = {
    protect: (isProtected: boolean) => void;
    children: ReactNode;
};

export const ScreenProtectionProvider: FC<ScreenProtectionProviderProps> = props => {
    const { protect, children } = props;

    const holders = useRef(0);

    const acquire = useCallback(() => {
        holders.current += 1;

        if (holders.current === 1) {
            protect(true);
        }

        return () => {
            holders.current -= 1;

            if (holders.current === 0) {
                protect(false);
            }
        };
    }, [protect]);

    return <ScreenProtectionContext value={{ acquire }}>{children}</ScreenProtectionContext>;
};
