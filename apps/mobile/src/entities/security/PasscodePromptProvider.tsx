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
    const requestRef = useRef<PasscodePromptRequest | null>(null);

    const open = useCallback((input: PasscodePromptInput) => {
        requestRef.current?.reject(new SecurityCheckCancelledError());

        const next = { ...input, id: ++nextIdRef.current };
        requestRef.current = next;
        setRequest(next);
    }, []);

    const close = useCallback((id: number) => {
        if (requestRef.current?.id === id) {
            requestRef.current = null;
            setRequest(null);
        }
    }, []);

    const value = useMemo(() => ({ request, open, close }), [request, open, close]);

    return <PasscodePromptContext value={value}>{children}</PasscodePromptContext>;
};
