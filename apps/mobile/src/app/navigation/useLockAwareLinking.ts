import type { LinkingOptions, ParamListBase } from '@react-navigation/native';
import { getStateFromPath } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useRef } from 'react';

import { fragmentToQuery, UNIVERSAL_LINK_HOST } from '@safely/ux';

import { ExpoPushNotifications } from '@mobile/shared/push-notifications';

export function useLockAwareLinking(isLocked: boolean): LinkingOptions<ParamListBase> {
    const pendingUrlRef = useRef<string | null>(null);
    const listenerRef = useRef<((url: string) => void) | null>(null);
    const isLockedRef = useRef(isLocked);

    useEffect(() => {
        isLockedRef.current = isLocked;
    }, [isLocked]);

    useEffect(() => {
        const handleUrl = (url: string) => {
            // the native cache survives reloadAppAsync (erase all data) and would replay this URL on the next mount
            Linking.clearInitialURL();

            const listener = listenerRef.current;

            if (isLockedRef.current || listener === null) {
                pendingUrlRef.current = url;

                return;
            }

            listener(url);
        };
        // read before the subscriptions: a URL they deliver clears this cache
        const initialUrl = Linking.getLinkingURL();
        const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
        const unsubscribePush = ExpoPushNotifications.subscribeToTappedUrls(handleUrl);

        if (initialUrl !== null) {
            handleUrl(initialUrl);
        }

        return () => {
            subscription.remove();
            unsubscribePush();
        };
    }, []);

    useEffect(() => {
        if (isLocked) {
            return;
        }

        const url = pendingUrlRef.current;
        const listener = listenerRef.current;

        if (url === null || listener === null) {
            return;
        }

        pendingUrlRef.current = null;
        listener(url);
    }, [isLocked]);

    return useMemo(
        () => ({
            enabled: true,
            // the scheme stays `createURL`: the dev client opens `exp+safely://`, not `safely://`
            prefixes: [Linking.createURL('/'), `https://${UNIVERSAL_LINK_HOST}`],
            getStateFromPath: (path, options) => getStateFromPath(fragmentToQuery(path), options),
            // called on the container's first render despite `initialState`, its result discarded: the effect above delivers the initial URL
            getInitialURL: () => null,
            subscribe(listener) {
                listenerRef.current = listener;

                const url = pendingUrlRef.current;

                if (url !== null && !isLockedRef.current) {
                    pendingUrlRef.current = null;
                    listener(url);
                }

                return () => {
                    listenerRef.current = null;
                };
            }
        }),
        []
    );
}
