import type { LinkingOptions, ParamListBase } from '@react-navigation/native';
import { getStateFromPath } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';

import { logger } from '@mobile/shared/logger';
import { fragmentToQuery } from '@mobile/shared/navigation';
import { ExpoPushNotifications } from '@mobile/shared/push-notifications';

const sUniversalLinkExtra = z.object({ universalLinkHost: z.string().min(1) });

function resolveLinkingPrefixes(): string[] {
    const extra = sUniversalLinkExtra.safeParse(Constants.expoConfig?.extra);

    if (!extra.success) {
        logger.error('linking.universal_link_host_missing');

        return [Linking.createURL('/')];
    }

    return [Linking.createURL('/'), `https://${extra.data.universalLinkHost}`];
}

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
            prefixes: resolveLinkingPrefixes(),
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
