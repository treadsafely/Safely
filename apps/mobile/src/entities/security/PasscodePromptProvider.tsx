import type { FC, PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { SecurityCheckCancelledError } from '@safely/ux';

import type { PromptAndCheckOptions } from './types';

export type PasscodePromptRequest = PromptAndCheckOptions & {
    id: number;
    resolve: () => void;
    reject: (reason: Error) => void;
};

type PasscodePromptInput = Omit<PasscodePromptRequest, 'id'>;

interface PasscodePromptContextValue {
    request: PasscodePromptRequest | null;
    open: (request: PasscodePromptInput) => void;
    close: (id: number) => void;
}

const PasscodePromptContext = createContext<PasscodePromptContextValue | undefined>(undefined);

export function usePasscodePrompt() {
    const context = useContext(PasscodePromptContext);

    if (!context) {
        throw new Error('usePasscodePrompt must be used within PasscodePromptProvider');
    }

    return context;
}

export const PasscodePromptProvider: FC<PropsWithChildren> = ({ children }) => {
    const [request, setRequest] = useState<PasscodePromptRequest | null>(null);
    const nextIdRef = useRef(0);

    const open = useCallback((input: PasscodePromptInput) => {
        const next = { ...input, id: ++nextIdRef.current };

        setRequest(previous => {
            previous?.reject(new SecurityCheckCancelledError());

            return next;
        });
    }, []);

    const close = useCallback((id: number) => {
        setRequest(previous => (previous?.id === id ? null : previous));
    }, []);

    const value = useMemo(() => ({ request, open, close }), [request, open, close]);

    return <PasscodePromptContext value={value}>{children}</PasscodePromptContext>;
};
