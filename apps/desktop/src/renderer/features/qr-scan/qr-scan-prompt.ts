import { create } from 'zustand';

export class QrScanCancelledError extends Error {
    constructor() {
        super('QR scan cancelled');

        this.name = 'QrScanCancelledError';
    }
}

export type QrScanRequest = {
    title: string;
    subtitle?: string;
    resolve: (value: string) => void;
    reject: (reason: Error) => void;
};

interface QrScanPromptState {
    request: QrScanRequest | null;
    open: (request: QrScanRequest) => void;
    close: () => void;
}

export const useQrScanPromptStore = create<QrScanPromptState>(set => ({
    request: null,
    open: request => set({ request }),
    close: () => set({ request: null })
}));

export type QrScanPromptOptions = {
    title: string;
    subtitle?: string;
};

export const qrScanPrompt = {
    request(options: QrScanPromptOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            useQrScanPromptStore.getState().open({ ...options, resolve, reject });
        });
    }
};
