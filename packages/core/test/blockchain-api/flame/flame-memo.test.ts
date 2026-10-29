import { describe, expect, it } from 'vitest';

import { isFlameMemoWithinLimit } from '../../../src';

const FLAME_MEMO_MAX_BYTES = globalThis.flameSdk.memoMaxBytes();

describe('isFlameMemoWithinLimit', () => {
    it('accepts a memo of exactly the byte limit', () => {
        expect(isFlameMemoWithinLimit('a'.repeat(FLAME_MEMO_MAX_BYTES))).toBe(true);
    });

    it('counts bytes, not characters', () => {
        expect(isFlameMemoWithinLimit('a'.repeat(FLAME_MEMO_MAX_BYTES - 2) + '🔥')).toBe(false);
    });
});
