import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useRef, useState } from 'react';

export type ResizeHandleProps = {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export type UseResizableWidthParams = {
    width: number;
    min: number;
    max: number;
    onChange: (width: number) => void;
};

export type UseResizableWidthReturn = {
    width: number;
    handleProps: ResizeHandleProps;
};

type DragStart = {
    x: number;
    width: number;
};

export function useResizableWidth(params: UseResizableWidthParams): UseResizableWidthReturn {
    const { width, min, max, onChange } = params;

    const [draft, setDraft] = useState<number | null>(null);
    const start = useRef<DragStart | null>(null);

    const clamp = useCallback(
        (value: number) => Math.min(max, Math.max(min, Math.round(value))),
        [min, max]
    );

    const onPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (event.button !== 0) {
                return;
            }

            event.currentTarget.setPointerCapture(event.pointerId);
            start.current = { x: event.clientX, width };
            setDraft(width);
        },
        [width]
    );

    const finish = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (start.current === null) {
                return;
            }

            const next = clamp(start.current.width + event.clientX - start.current.x);

            start.current = null;
            setDraft(null);

            if (next !== width) {
                onChange(next);
            }
        },
        [clamp, width, onChange]
    );

    const onPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (start.current === null) {
                return;
            }

            if (event.buttons === 0) {
                finish(event);
                return;
            }

            setDraft(clamp(start.current.width + event.clientX - start.current.x));
        },
        [clamp, finish]
    );

    return {
        width: clamp(draft ?? width),
        handleProps: {
            onPointerDown,
            onPointerMove,
            onPointerUp: finish,
            onPointerCancel: finish,
            onLostPointerCapture: finish
        }
    };
}
