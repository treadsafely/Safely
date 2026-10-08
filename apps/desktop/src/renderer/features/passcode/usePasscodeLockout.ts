import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { LockoutState } from '@safely/ux';
import {
    NO_LOCKOUT,
    nextLockoutState,
    useCountdownToTimestamp,
    useSuspenseQuery
} from '@safely/ux';

import { lockoutKeys } from './keys';
import { useDesktopLayerRegularStorage } from '../../shared';

export function usePasscodeLockout() {
    const client = useQueryClient();
    const { get: storageGet, set: storageSet } = useDesktopLayerRegularStorage('passcodeLockout');

    const { data } = useSuspenseQuery({
        queryKey: lockoutKeys.state.toKey(),
        async queryFn(): Promise<LockoutState> {
            return (await storageGet()) ?? NO_LOCKOUT;
        }
    });

    const remainingSeconds = useCountdownToTimestamp(data.lockedUntil);

    const persist = useCallback(
        async (next: LockoutState) => {
            await storageSet(next);
            await client.invalidateQueries({ queryKey: lockoutKeys.state.toKey() });
        },
        [storageSet, client]
    );

    /* re-read instead of trusting the query cache: a stale count silently forgives an attempt */
    const recordFailure = useCallback(async () => {
        const current = (await storageGet()) ?? NO_LOCKOUT;

        await persist(nextLockoutState(current, Date.now()));
    }, [storageGet, persist]);

    const reset = useCallback(() => persist(NO_LOCKOUT), [persist]);

    return {
        isLocked: remainingSeconds > 0,
        remainingSeconds,
        failedAttempts: data.failedAttempts,
        recordFailure,
        reset
    };
}
