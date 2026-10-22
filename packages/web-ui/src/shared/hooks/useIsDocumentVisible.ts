import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void): (() => void) => {
    document.addEventListener('visibilitychange', onChange);

    return () => document.removeEventListener('visibilitychange', onChange);
};

const getIsVisible = (): boolean => document.visibilityState === 'visible';

export function useIsDocumentVisible(): boolean {
    return useSyncExternalStore(subscribe, getIsVisible);
}
