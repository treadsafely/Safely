import type { PointerEvent } from 'react';
import { useCallback, useRef } from 'react';

const LONG_PRESS_MS = 1_200;

export function useLongPress(onLongPress: () => void) {
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clear = useCallback(() => {
        if (timeout.current) {
            clearTimeout(timeout.current);
            timeout.current = null;
        }
    }, []);

    const onPointerDown = useCallback(
        (event: PointerEvent) => {
            if (event.button !== 0) {
                return;
            }

            timeout.current = setTimeout(onLongPress, LONG_PRESS_MS);
        },
        [onLongPress]
    );

    return {
        onPointerDown,
        onPointerUp: clear,
        onPointerLeave: clear,
        onPointerCancel: clear
    };
}
