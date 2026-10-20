import { create } from 'zustand';

import { SecurityCheckCancelledError } from '@safely/ux';

type PasscodePromptRequest = {
    title?: string;
    subtitle?: string;
    resolve: () => void;
    reject: (reason: Error) => void;
};

interface PasscodePromptState {
    request: PasscodePromptRequest | null;
    open: (request: PasscodePromptRequest) => void;
    close: (request: PasscodePromptRequest) => void;
    cancel: () => void;
}

export const usePasscodePromptStore = create<PasscodePromptState>((set, get) => ({
    request: null,
    open: request => {
        get().request?.reject(new SecurityCheckCancelledError());
        set({ request });
    },
    close: request => {
        if (get().request === request) {
            set({ request: null });
        }
    },
    cancel: () => {
        const current = get().request;
        if (current) {
            current.reject(new SecurityCheckCancelledError());
            set({ request: null });
        }
    }
}));

export type PasscodePromptOptions = {
    title?: string;
    subtitle?: string;
};

export const passcodePrompt = {
    request(options?: PasscodePromptOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            usePasscodePromptStore.getState().open({ ...options, resolve, reject });
        });
    }
};
