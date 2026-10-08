import { z } from 'zod';

export const sLockoutState = z.object({
    failedAttempts: z.number(),
    lockedUntil: z.number().nullable()
});

export type LockoutState = z.infer<typeof sLockoutState>;

export const NO_LOCKOUT: LockoutState = { failedAttempts: 0, lockedUntil: null };

export type LockoutPolicy = (failedAttempts: number) => number | null;

const FREE_ATTEMPTS = 3;

const DEFAULT_DELAYS: Record<number, number> = {
    4: 60_000,
    5: 5 * 60_000,
    6: 15 * 60_000,
    7: 60 * 60_000,
    8: 6 * 60 * 60_000
};

const MAX_DELAY = 24 * 60 * 60_000;

export const defaultLockoutPolicy: LockoutPolicy = failedAttempts =>
    failedAttempts <= FREE_ATTEMPTS ? null : (DEFAULT_DELAYS[failedAttempts] ?? MAX_DELAY);

export function nextLockoutState(
    current: LockoutState,
    now: number,
    policy: LockoutPolicy = defaultLockoutPolicy
): LockoutState {
    const failedAttempts = current.failedAttempts + 1;
    const delay = policy(failedAttempts);

    return {
        failedAttempts,
        lockedUntil: delay === null ? null : now + delay
    };
}

export type LockoutRemainingCopy = {
    translationKey: string;
    count: number;
};

const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = 60 * 60;

/* rounded minutes decide the unit, so 59:30 reads as "1 hour" rather than "60 minutes" */
export function lockoutRemainingCopy(remainingSeconds: number): LockoutRemainingCopy {
    const minutes = Math.ceil(remainingSeconds / SECONDS_IN_MINUTE);

    if (minutes >= 60) {
        return {
            translationKey: 'passcode.lockout.subtitleHours',
            count: Math.ceil(remainingSeconds / SECONDS_IN_HOUR)
        };
    }

    return { translationKey: 'passcode.lockout.subtitleMinutes', count: minutes };
}
