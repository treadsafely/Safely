export function findScrollRoot(node: HTMLElement): HTMLElement | null {
    for (let parent = node.parentElement; parent !== null; parent = parent.parentElement) {
        const { overflowY } = getComputedStyle(parent);

        if (overflowY === 'auto' || overflowY === 'scroll') {
            return parent;
        }
    }

    return null;
}
