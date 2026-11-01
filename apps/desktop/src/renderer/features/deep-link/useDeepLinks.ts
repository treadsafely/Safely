import { useEffect, useRef } from 'react';

import type { MainLocation } from '@safely/web-ui';

import { resolveDeepLink } from './resolve-deep-link';
import { logger } from '../../logger';
import { platform } from '../../platform';
import { usePasscodePromptStore } from '../passcode';

export function useDeepLinks(onNavigate: (location: MainLocation) => void): void {
    const isPromptOpen = usePasscodePromptStore(state => state.request !== null);
    const onNavigateRef = useRef(onNavigate);
    const heldRef = useRef<MainLocation | null>(null);

    useEffect(() => {
        onNavigateRef.current = onNavigate;
    });

    useEffect(() => {
        const open = (url: string): void => {
            const location = resolveDeepLink(url);

            if (location === null) {
                logger.warn('deep link ignored: not a route of this app');
                return;
            }

            if (usePasscodePromptStore.getState().request !== null) {
                heldRef.current = location;
                return;
            }

            onNavigateRef.current(location);
        };

        const take = (): void => {
            void platform.deepLinks.take().then(url => {
                if (url !== null) {
                    open(url);
                }
            });
        };

        const unsubscribe = platform.deepLinks.onReceived(take);

        take();

        return unsubscribe;
    }, []);

    useEffect(() => {
        const held = heldRef.current;

        if (isPromptOpen || held === null) {
            return;
        }

        heldRef.current = null;
        onNavigateRef.current(held);
    }, [isPromptOpen]);
}
