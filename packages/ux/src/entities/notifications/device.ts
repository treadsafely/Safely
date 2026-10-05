import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { PushPermissionStatus } from '@safely/core';

import { notificationsKeys } from './keys';
import { useAppContext, useAppState, useSharedUxStorage } from '../../shared';

export function usePushPermissionQuery() {
    const { current } = useAppState();
    const { pushNotifications } = useAppContext();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (current === 'active') {
            void queryClient.invalidateQueries({
                queryKey: notificationsKeys.permission.toKey()
            });
        }
    }, [current, queryClient]);

    return useQuery({
        queryKey: notificationsKeys.permission.toKey(),
        queryFn: () => pushNotifications.getPermissionStatus(),
        staleTime: Infinity
    });
}

export function usePushNotificationsEnabledQuery() {
    const { get } = useSharedUxStorage('notificationsEnabled');

    return useQuery({
        queryKey: notificationsKeys.pushEnabled.toKey(),
        queryFn: async () => (await get()) ?? false,
        staleTime: Infinity
    });
}

export function useSetPushNotificationsEnabled() {
    const { pushNotifications } = useAppContext();
    const queryClient = useQueryClient();
    const { set } = useSharedUxStorage('notificationsEnabled');

    return useMutation<PushPermissionStatus, Error, boolean>({
        async mutationFn(isEnabled) {
            const status = isEnabled
                ? await pushNotifications.requestPermission()
                : await pushNotifications.getPermissionStatus();

            await set(isEnabled && status === 'granted');

            return status;
        },
        async onSettled() {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: notificationsKeys.pushEnabled.toKey() }),
                queryClient.invalidateQueries({ queryKey: notificationsKeys.permission.toKey() })
            ]);
        }
    });
}

export function useNewsNotificationsEnabledQuery() {
    const { get } = useSharedUxStorage('newsNotificationsEnabled');

    return useQuery({
        queryKey: notificationsKeys.newsEnabled.toKey(),
        queryFn: async () => (await get()) ?? true,
        staleTime: Infinity
    });
}

export function useSetNewsNotificationsEnabled() {
    const { set } = useSharedUxStorage('newsNotificationsEnabled');
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (isEnabled: boolean) => set(isEnabled),
        onSuccess: (_, isEnabled) =>
            queryClient.setQueryData(notificationsKeys.newsEnabled.toKey(), isEnabled)
    });
}
