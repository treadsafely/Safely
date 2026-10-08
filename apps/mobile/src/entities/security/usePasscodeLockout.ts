import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
    NO_LOCKOUT,
    nextLockoutState,
    useCountdownToTimestamp,
    useSuspenseQuery
} from '@safely/ux';

import { useMobileLayerRegularStorage } from '@mobile/shared/storage';

import { lockoutKeys } from './keys';

export function usePasscodeLockout() {
    const client = useQueryClient();
    const {
        get: storageGet,
        set: storageSet,
        remove: storageRemove
    } = useMobileLayerRegularStorage('passcodeLockout');

    const { data } = useSuspenseQuery({
        queryKey: lockoutKeys.state.toKey(),
        async queryFn() {
            return (await storageGet()) ?? NO_LOCKOUT;
        }
    });

    const lockedUntil = data.lockedUntil;
    const remainingSeconds = useCountdownToTimestamp(lockedUntil);

    const isLocked = remainingSeconds > 0;

    /* re-read instead of trusting the query cache: a stale count silently forgives an attempt */
    const recordFailedAttempt = useCallback(async () => {
        const current = (await storageGet()) ?? NO_LOCKOUT;

        await storageSet(nextLockoutState(current, Date.now()));
        await client.invalidateQueries({
            queryKey: lockoutKeys.state.toKey()
        });
    }, [storageGet, storageSet, client]);

    const resetAttempts = useCallback(async () => {
        await storageRemove();
        await client.invalidateQueries({
            queryKey: lockoutKeys.state.toKey()
        });
    }, [storageRemove, client]);

    return {
        isLocked,
        remainingSeconds,
        failedAttempts: data.failedAttempts,
        recordFailedAttempt,
        resetAttempts
    };
}
