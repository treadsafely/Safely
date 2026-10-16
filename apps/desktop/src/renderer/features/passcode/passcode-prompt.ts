import { create } from 'zustand';

type PasscodePromptRequest = {
    title?: string;
    subtitle?: string;
    resolve: () => void;
    reject: (reason: Error) => void;
};

interface PasscodePromptState {
    request: PasscodePromptRequest | null;
    open: (request: PasscodePromptRequest) => void;
    close: () => void;
}

export const usePasscodePromptStore = create<PasscodePromptState>(set => ({
    request: null,
    open: request => set({ request }),
    close: () => set({ request: null })
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
