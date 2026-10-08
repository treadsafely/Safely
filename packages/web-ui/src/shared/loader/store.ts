import { create } from 'zustand';

import type { LoaderService } from '@safely/ux';

interface LoaderState {
    pending: number;
    show: () => void;
    hide: () => void;
}

export const useLoaderStore = create<LoaderState>(set => ({
    pending: 0,
    show: () => set(state => ({ pending: state.pending + 1 })),
    hide: () => set(state => ({ pending: Math.max(0, state.pending - 1) }))
}));

export const loaderService: LoaderService = {
    show: () => useLoaderStore.getState().show(),
    hide: () => useLoaderStore.getState().hide(),
    async withLoader(callback) {
        const { show, hide } = useLoaderStore.getState();

        show();

        try {
            return await callback();
        } finally {
            hide();
        }
    }
};
