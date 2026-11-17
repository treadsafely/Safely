import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRelativeDateLabel } from '../../../src';
import { createTestAppContext, renderHookWithProviders } from '../../harness';

const NOW = new Date(2026, 5, 15, 12, 0, 0);
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const label = (timestamp: number): string => {
    const { result } = renderHookWithProviders(() => useRelativeDateLabel(), {
        appContext: createTestAppContext()
    });

    return result.current(timestamp);
};

describe('useRelativeDateLabel', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('counts minutes and hours back within today', () => {
        expect(label(NOW.getTime() - 20_000)).toBe('relativeDate.justNow');
        expect(label(NOW.getTime() - 5 * MINUTE_MS)).toBe('relativeDate.minutesAgo:{"count":5}');
        expect(label(NOW.getTime() - 11 * HOUR_MS)).toBe('relativeDate.hoursAgo:{"count":11}');
    });

    it('names yesterday with the time of day', () => {
        expect(label(new Date(2026, 5, 14, 23, 45).getTime())).toMatch(
            /^relativeDate\.yesterdayAt:\{"time":".*45.*"\}$/
        );
    });

    it('spells the date out, with the year only for a past year', () => {
        const thisYear = label(new Date(2026, 0, 27, 23, 43).getTime());
        const pastYear = label(new Date(2025, 0, 27, 23, 43).getTime());

        expect(thisYear).toContain('27');
        expect(thisYear).not.toContain('2026');
        expect(pastYear).toContain('2025');
    });
});
