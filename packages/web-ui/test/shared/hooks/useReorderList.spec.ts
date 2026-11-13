import { describe, expect, it } from 'vitest';

import type { ItemRect } from '../../../src/shared/hooks/useReorderList';
import { clampOffset, resolveTargetIndex } from '../../../src/shared/hooks/useReorderList';

const GAP = 2;

const layout = (heights: number[]): ItemRect[] => {
    let top = 0;

    return heights.map((height, index) => {
        const rect = { id: String(index), top, height };
        top += height + GAP;

        return rect;
    });
};

/* three short rows, a Ledger group of three rows, two short rows */
const rects = layout([48, 48, 48, 150, 48, 48]);

describe('resolveTargetIndex', () => {
    it('moves a tall group past a short row once its edge crosses that row', () => {
        const group = 3;
        const below = rects[4];
        const bottom = rects[group].top + rects[group].height;
        const almost = below.top + below.height / 2 - bottom - 1;

        expect(resolveTargetIndex(rects, group, group, almost)).toBe(group);
        expect(resolveTargetIndex(rects, group, group, almost + 2)).toBe(group + 1);
    });

    it('moves a tall group up past a short row the same way', () => {
        const group = 3;
        const above = rects[2];
        const almost = above.top + above.height / 2 - rects[group].top + 1;

        expect(resolveTargetIndex(rects, group, group, almost)).toBe(group);
        expect(resolveTargetIndex(rects, group, group, almost - 2)).toBe(group - 1);
    });

    it('needs a short row to reach the middle of the group before they swap', () => {
        const row = 2;
        const group = rects[3];
        const bottom = rects[row].top + rects[row].height;
        const almost = group.top + group.height / 2 - bottom - 1;

        expect(resolveTargetIndex(rects, row, row, almost)).toBe(row);
        expect(resolveTargetIndex(rects, row, row, almost + 2)).toBe(row + 1);
    });

    it('keeps the live order until the dragged item crosses back', () => {
        const row = 2;
        const past = rects[3].top + rects[3].height / 2 - (rects[row].top + rects[row].height) + 1;

        expect(resolveTargetIndex(rects, row, row + 1, past)).toBe(row + 1);
        /* the group now sits where the row started: back only once the row's top crosses its middle */
        const groupMiddle = rects[row].top + rects[3].height / 2;

        expect(resolveTargetIndex(rects, row, row + 1, groupMiddle - rects[row].top + 1)).toBe(
            row + 1
        );
        expect(resolveTargetIndex(rects, row, row + 1, groupMiddle - rects[row].top - 1)).toBe(row);
    });
});

describe('clampOffset', () => {
    const bounds = { top: rects[0].top, bottom: rects[5].top + rects[5].height };

    it('passes an offset through while the item stays inside the list', () => {
        expect(clampOffset(rects[2], bounds, 30)).toBe(30);
        expect(clampOffset(rects[2], bounds, -30)).toBe(-30);
    });

    it('stops the item at the first and the last slot however far the pointer goes', () => {
        expect(clampOffset(rects[2], bounds, -1000)).toBe(bounds.top - rects[2].top);
        expect(clampOffset(rects[2], bounds, 1000)).toBe(
            bounds.bottom - rects[2].height - rects[2].top
        );
    });

    it('cuts the range down to a clipping container', () => {
        const clipped = { top: rects[1].top, bottom: rects[4].top + rects[4].height };

        expect(clampOffset(rects[2], clipped, -1000)).toBe(rects[1].top - rects[2].top);
        expect(clampOffset(rects[2], clipped, 1000)).toBe(
            clipped.bottom - rects[2].height - rects[2].top
        );
    });
});
