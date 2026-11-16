import type { KeyboardEvent } from 'react';

const NEXT_INDEX: Partial<Record<string, (index: number, last: number) => number>> = {
    ArrowDown: (index, last) => Math.min(index + 1, last),
    ArrowUp: index => Math.max(index - 1, 0),
    Home: () => 0,
    End: (_index, last) => last
};

export function focusListItem(
    event: KeyboardEvent<HTMLElement>,
    itemSelector: string
): HTMLElement | null {
    const nextIndex = NEXT_INDEX[event.key];
    const isTyping =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;

    if (nextIndex === undefined || event.defaultPrevented || isTyping) {
        return null;
    }

    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(itemSelector));
    const index = items.findIndex(item => item === document.activeElement);

    if (index === -1) {
        return null;
    }

    event.preventDefault();

    const item = items[nextIndex(index, items.length - 1)] ?? null;

    item?.focus();

    return item;
}
