import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import type { LockoutState } from '@safely/ux';
import {
    NO_LOCKOUT,
    nextLockoutState,
    useCountdownToTimestamp,
    useSuspenseQuery
} from '@safely/ux';

import { lockoutKeys } from './keys';
import { useDesktopLayerEncryptedStorage } from '../../shared';

export function usePasscodeLockout() {
    const client = useQueryClient();
    const { get: storageGet, set: storageSet } = useDesktopLayerEncryptedStorage('passcodeLockout');

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

    const writes = useRef<Promise<void>>(Promise.resolve());
    const serialize = useCallback((task: () => Promise<void>): Promise<void> => {
        const next = writes.current.then(task, task);
        writes.current = next;
        return next;
    }, []);

    /* re-read instead of trusting the query cache: a stale count silently forgives an attempt */
    const recordFailure = useCallback(
        () =>
            serialize(async () => {
                const current = (await storageGet()) ?? NO_LOCKOUT;

                await persist(nextLockoutState(current, Date.now()));
            }),
        [serialize, storageGet, persist]
    );

    const reset = useCallback(() => serialize(() => persist(NO_LOCKOUT)), [serialize, persist]);

    return {
        isLocked: remainingSeconds > 0,
        hasLockedOut: data.lockedUntil !== null,
        remainingSeconds,
        failedAttempts: data.failedAttempts,
        recordFailure,
        reset
    };
}
