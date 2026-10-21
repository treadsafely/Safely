import { useEffect, useRef } from 'react';

import { useAppState } from './useAppState';

export function useEnteredBackground(onEnteredBackground: () => void): void {
    const { current, previous } = useAppState();
    const callbackRef = useRef(onEnteredBackground);

    useEffect(() => {
        callbackRef.current = onEnteredBackground;
    });

    useEffect(() => {
        /* 'inactive' is another window taking focus, not the app leaving the screen */
        if (previous !== 'background' && current === 'background') {
            callbackRef.current();
        }
    }, [current, previous]);
}
