import { describe, expect, it } from 'vitest';

import { FLAME_MEMO_MAX_BYTES, clampFlameMemo } from '../../../src';

describe('clampFlameMemo', () => {
    it('keeps a memo that fits', () => {
        const memo = 'a'.repeat(FLAME_MEMO_MAX_BYTES);

        expect(clampFlameMemo(memo)).toBe(memo);
    });

    it('cuts a memo at the byte limit without splitting a code point', () => {
        const memo = 'a'.repeat(FLAME_MEMO_MAX_BYTES - 2) + '🔥';

        expect(clampFlameMemo(memo)).toBe('a'.repeat(FLAME_MEMO_MAX_BYTES - 2));
    });
});
