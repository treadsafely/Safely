import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD_PX = 4;

const SETTLE_MS = 180;
const SETTLE_TRANSITION = `transform ${SETTLE_MS}ms ease`;

export type ItemRect = {
    id: string;
    top: number;
    height: number;
};

type DragState = {
    id: string;
    fromIndex: number;
    toIndex: number;
    offset: number;
    isReleasing: boolean;
};

export type ReorderItemProps = {
    ref: (node: HTMLDivElement | null) => void;
    style: CSSProperties;
    isDragging: boolean;
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerDownCapture: () => void;
    onClickCapture: (event: { stopPropagation: () => void }) => void;
};

export type UseReorderListParams = {
    ids: string[];
    onReorder: (ids: string[]) => void;
};

export type UseReorderListReturn = {
    orderedIds: string[];
    isDragging: boolean;
    getItemProps: (id: string) => ReorderItemProps;
};

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    return next;
}

function measure(ids: string[], nodes: Map<string, HTMLDivElement>): ItemRect[] {
    return ids.map(id => {
        const rect = nodes.get(id)?.getBoundingClientRect();

        return { id, top: rect?.top ?? 0, height: rect?.height ?? 0 };
    });
}

function resolveGap(rects: ItemRect[]): number {
    if (rects.length < 2) {
        return 0;
    }

    return Math.max(0, rects[1].top - (rects[0].top + rects[0].height));
}

function resolveLiveTops(rects: ItemRect[], fromIndex: number, toIndex: number): number[] {
    const gap = resolveGap(rects);
    const order = moveItem(
        rects.map((_, index) => index),
        fromIndex,
        toIndex
    );
    const tops = new Array<number>(rects.length);
    let top = rects[0]?.top ?? 0;

    order.forEach(index => {
        tops[index] = top;
        top += rects[index].height + gap;
    });

    return tops;
}

export function resolveTargetIndex(
    rects: ItemRect[],
    fromIndex: number,
    toIndex: number,
    offset: number
): number {
    const dragged = rects[fromIndex];
    const draggedTop = dragged.top + offset;
    const draggedBottom = draggedTop + dragged.height;
    const order = moveItem(
        rects.map((_, index) => index),
        fromIndex,
        toIndex
    );
    const tops = resolveLiveTops(rects, fromIndex, toIndex);
    const midpointAt = (slot: number): number => {
        const index = order[slot];

        return tops[index] + rects[index].height / 2;
    };

    let target = toIndex;

    for (let slot = toIndex + 1; slot < rects.length; slot++) {
        if (draggedBottom > midpointAt(slot)) {
            target = slot;
        } else {
            break;
        }
    }

    if (target !== toIndex) {
        return target;
    }

    for (let slot = toIndex - 1; slot >= 0; slot--) {
        if (draggedTop < midpointAt(slot)) {
            target = slot;
        } else {
            break;
        }
    }

    return target;
}

function resolveRestingOffset(rects: ItemRect[], fromIndex: number, toIndex: number): number {
    const gap = resolveGap(rects);
    const step = (rect: ItemRect): number => rect.height + gap;

    if (toIndex > fromIndex) {
        return rects.slice(fromIndex + 1, toIndex + 1).reduce((sum, rect) => sum + step(rect), 0);
    }

    return -rects.slice(toIndex, fromIndex).reduce((sum, rect) => sum + step(rect), 0);
}

function resolveShift(drag: DragState | null, rects: ItemRect[], index: number): number {
    if (drag === null) {
        return 0;
    }

    if (index === drag.fromIndex) {
        return drag.offset;
    }

    const step = rects[drag.fromIndex].height + resolveGap(rects);

    if (drag.fromIndex < drag.toIndex && index > drag.fromIndex && index <= drag.toIndex) {
        return -step;
    }

    if (drag.fromIndex > drag.toIndex && index >= drag.toIndex && index < drag.fromIndex) {
        return step;
    }

    return 0;
}

export function useReorderList({ ids, onReorder }: UseReorderListParams): UseReorderListReturn {
    const key = ids.join('|');
    const nodes = useRef(new Map<string, HTMLDivElement>());
    const rects = useRef<ItemRect[]>([]);
    const origin = useRef(0);
    const hasMoved = useRef(false);
    const isSettlingRef = useRef(false);
    const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(settleTimer.current), []);

    const [drag, setDrag] = useState<DragState | null>(null);
    const [isSettling, setIsSettling] = useState(false);
    const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);

    useEffect(() => setPendingOrder(null), [key]);

    const orderedIds = pendingOrder ?? ids;
    const latest = useRef({ orderedIds, onReorder });

    useEffect(() => {
        latest.current = { orderedIds, onReorder };
    });

    const isFollowingPointer = drag !== null && !drag.isReleasing;

    useEffect(() => {
        if (!isSettling) {
            return;
        }

        const frame = requestAnimationFrame(() => setIsSettling(false));

        return () => cancelAnimationFrame(frame);
    }, [isSettling]);

    useEffect(() => {
        if (!isFollowingPointer) {
            return;
        }

        const move = (event: PointerEvent): void => {
            setDrag(current => {
                if (current === null) {
                    return current;
                }

                const offset = event.clientY - origin.current;

                if (!hasMoved.current && Math.abs(offset) < DRAG_THRESHOLD_PX) {
                    return current;
                }

                hasMoved.current = true;

                return {
                    ...current,
                    offset,
                    toIndex: resolveTargetIndex(
                        rects.current,
                        current.fromIndex,
                        current.toIndex,
                        offset
                    )
                };
            });
        };

        const drop = (): void => {
            setDrag(current => {
                if (current === null || current.isReleasing) {
                    return current;
                }

                if (!hasMoved.current || current.toIndex === current.fromIndex) {
                    return null;
                }

                const { fromIndex, toIndex } = current;

                isSettlingRef.current = true;
                settleTimer.current = setTimeout(() => {
                    const next = moveItem(latest.current.orderedIds, fromIndex, toIndex);

                    setIsSettling(true);
                    setPendingOrder(next);
                    latest.current.onReorder(next);
                    setDrag(null);
                    isSettlingRef.current = false;
                }, SETTLE_MS);

                return {
                    ...current,
                    offset: resolveRestingOffset(rects.current, fromIndex, toIndex),
                    isReleasing: true
                };
            });
        };

        const cancel = (): void => {
            hasMoved.current = false;
            setDrag(null);
        };

        const cancelOnEscape = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                cancel();
            }
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', drop);
        window.addEventListener('pointercancel', drop);
        window.addEventListener('blur', drop);
        window.addEventListener('keydown', cancelOnEscape);

        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', drop);
            window.removeEventListener('pointercancel', drop);
            window.removeEventListener('blur', drop);
            window.removeEventListener('keydown', cancelOnEscape);
        };
    }, [isFollowingPointer]);

    const handlePointerDown = useCallback(
        (id: string, event: ReactPointerEvent<HTMLDivElement>) => {
            if (event.button !== 0) {
                return;
            }

            const fromIndex = latest.current.orderedIds.indexOf(id);

            if (fromIndex === -1 || isSettlingRef.current) {
                return;
            }

            rects.current = measure(latest.current.orderedIds, nodes.current);
            origin.current = event.clientY;
            hasMoved.current = false;
            setDrag({ id, fromIndex, toIndex: fromIndex, offset: 0, isReleasing: false });
        },
        []
    );

    const getItemProps = useCallback(
        (id: string): ReorderItemProps => {
            const index = orderedIds.indexOf(id);

            return {
                ref: node => {
                    if (node === null) {
                        nodes.current.delete(id);
                    } else {
                        nodes.current.set(id, node);
                    }
                },
                style: {
                    transform: `translateY(${resolveShift(drag, rects.current, index)}px)`,
                    transition:
                        isSettling || (drag?.id === id && !drag.isReleasing)
                            ? 'none'
                            : SETTLE_TRANSITION
                },
                isDragging: drag?.id === id,
                onPointerDown: event => handlePointerDown(id, event),
                onPointerDownCapture: () => {
                    hasMoved.current = false;
                },
                onClickCapture: event => {
                    if (hasMoved.current) {
                        event.stopPropagation();
                    }
                }
            };
        },
        [orderedIds, drag, isSettling, handlePointerDown]
    );

    return { orderedIds, isDragging: isFollowingPointer, getItemProps };
}
