import { useEffect, useEffectEvent } from 'react';

import type { DeepLinkTarget } from './resolve-deep-link';
import { resolveDeepLink } from './resolve-deep-link';
import { logger } from '../../logger';
import { platform } from '../../platform';
import { usePasscodePromptStore } from '../passcode';

export function useDeepLinks(onLink: (target: DeepLinkTarget) => void, isEnabled = true): void {
    const isPromptOpen = usePasscodePromptStore(state => state.request !== null);
    const isReady = isEnabled && !isPromptOpen;

    const pull = useEffectEvent(async () => {
        const url = await platform.deepLinks.take();

        if (url === null) {
            return;
        }

        const target = resolveDeepLink(url);

        if (target === null) {
            logger.warn('deep link ignored: not a route of this app');
            return;
        }

        onLink(target);
    });

    useEffect(() => {
        if (!isReady) {
            return;
        }

        void pull();

        return platform.deepLinks.onReceived(() => void pull());
    }, [isReady]);
}
