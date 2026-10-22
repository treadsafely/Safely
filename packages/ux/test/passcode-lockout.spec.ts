import { describe, expect, it } from 'vitest';

import type { LockoutPolicy } from '../src/shared/security';
import {
    defaultLockoutPolicy,
    lockoutRemainingCopy,
    nextLockoutState,
    NO_LOCKOUT,
    sLockoutState
} from '../src/shared/security';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('defaultLockoutPolicy', () => {
    it('allows the first three attempts without a delay', () => {
        expect(defaultLockoutPolicy(1)).toBeNull();
        expect(defaultLockoutPolicy(2)).toBeNull();
        expect(defaultLockoutPolicy(3)).toBeNull();
    });

    it('escalates from the fourth attempt on', () => {
        expect(defaultLockoutPolicy(4)).toBe(MINUTE);
        expect(defaultLockoutPolicy(5)).toBe(5 * MINUTE);
        expect(defaultLockoutPolicy(6)).toBe(15 * MINUTE);
        expect(defaultLockoutPolicy(7)).toBe(HOUR);
        expect(defaultLockoutPolicy(8)).toBe(6 * HOUR);
    });

    it('caps at a day beyond the table', () => {
        expect(defaultLockoutPolicy(9)).toBe(24 * HOUR);
        expect(defaultLockoutPolicy(50)).toBe(24 * HOUR);
    });
});

describe('nextLockoutState', () => {
    const now = 1_700_000_000_000;

    it('counts the attempt without locking while attempts are free', () => {
        expect(nextLockoutState(NO_LOCKOUT, now)).toEqual({
            failedAttempts: 1,
            lockedUntil: null
        });
    });

    it('locks from the current time once the policy returns a delay', () => {
        expect(nextLockoutState({ failedAttempts: 3, lockedUntil: null }, now)).toEqual({
            failedAttempts: 4,
            lockedUntil: now + MINUTE
        });
    });

    it('keeps counting past an existing lockout', () => {
        expect(nextLockoutState({ failedAttempts: 4, lockedUntil: now - 1 }, now)).toEqual({
            failedAttempts: 5,
            lockedUntil: now + 5 * MINUTE
        });
    });

    it('takes the schedule from the injected policy', () => {
        const strict: LockoutPolicy = () => HOUR;

        expect(nextLockoutState(NO_LOCKOUT, now, strict)).toEqual({
            failedAttempts: 1,
            lockedUntil: now + HOUR
        });
    });

    it('clears the lock when the policy returns no delay', () => {
        const lenient: LockoutPolicy = () => null;

        expect(
            nextLockoutState({ failedAttempts: 9, lockedUntil: now + HOUR }, now, lenient)
        ).toEqual({ failedAttempts: 10, lockedUntil: null });
    });
});

describe('sLockoutState', () => {
    it('rejects a stored shape it cannot trust', () => {
        const parse = (input: unknown): boolean => sLockoutState.safeParse(input).success;

        expect(parse({ failedAttempts: 2, lockedUntil: null })).toBe(true);
        expect(parse({ failedAttempts: '2', lockedUntil: null })).toBe(false);
        expect(parse(null)).toBe(false);
    });
});

describe('lockoutRemainingCopy', () => {
    it('counts up whole minutes', () => {
        expect(lockoutRemainingCopy(1)).toEqual({
            translationKey: 'passcode.lockout.subtitleMinutes',
            count: 1
        });
        expect(lockoutRemainingCopy(61)).toEqual({
            translationKey: 'passcode.lockout.subtitleMinutes',
            count: 2
        });
    });

    it('switches to hours once the rounded minutes reach sixty', () => {
        expect(lockoutRemainingCopy(59 * 60)).toEqual({
            translationKey: 'passcode.lockout.subtitleMinutes',
            count: 59
        });
        expect(lockoutRemainingCopy(59 * 60 + 30)).toEqual({
            translationKey: 'passcode.lockout.subtitleHours',
            count: 1
        });
    });

    it('rounds hours up', () => {
        expect(lockoutRemainingCopy(6 * 3600)).toEqual({
            translationKey: 'passcode.lockout.subtitleHours',
            count: 6
        });
        expect(lockoutRemainingCopy(6 * 3600 + 1)).toEqual({
            translationKey: 'passcode.lockout.subtitleHours',
            count: 7
        });
    });
});
