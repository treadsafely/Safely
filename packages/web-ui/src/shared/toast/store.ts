import { create } from 'zustand';

import type { ToastOptions, ToastService } from '@safely/ux';

const DEFAULT_DURATION_MS = 4000;

export interface ToastEntry extends ToastOptions {
    id: number;
}

interface ToastState {
    entries: ToastEntry[];
    show: (options: ToastOptions) => void;
    dismiss: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>(set => ({
    entries: [],
    show: options => {
        const id = nextId++;

        set(state => ({ entries: [...state.entries, { ...options, id }] }));

        setTimeout(
            () =>
                set(state => ({
                    entries: state.entries.filter(entry => entry.id !== id)
                })),
            options.duration ?? DEFAULT_DURATION_MS
        );
    },
    dismiss: id => set(state => ({ entries: state.entries.filter(entry => entry.id !== id) }))
}));

/** Callable outside React: `IAppContext.toast` is a plain object, not a hook. */
export const toastService: ToastService = {
    show: options => useToastStore.getState().show(options)
};
