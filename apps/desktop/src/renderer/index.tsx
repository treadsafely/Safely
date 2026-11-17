/* Must stay the first import: it installs the globals the domain packages read at load time. */
import './global-polyfills';

import { useSyncExternalStore } from 'react';
import type { Root as ReactRoot } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import type { WindowControls } from '@safely/web-ui';
import '@safely/web-ui/styles.css';

import { App, AppProviders } from './app';
import { i18n } from './i18n';
import { logger } from './logger';
import type { DesktopOs } from './platform';
import { platform } from './platform';
import { loadFlameSdk } from './platform/flame';

const container = document.getElementById('root');

if (!container) {
    throw new Error('Renderer root element is missing in index.html');
}

const WINDOW_CONTROLS: Record<DesktopOs, WindowControls> = {
    darwin: 'left',
    win32: 'right',
    other: null
};

function Root() {
    const isFullScreen = useSyncExternalStore(
        platform.subscribeFullScreen,
        platform.getIsFullScreen
    );

    return (
        <App
            windowControls={isFullScreen ? null : WINDOW_CONTROLS[platform.os]}
            isFullScreen={isFullScreen}
        />
    );
}

async function boot(root: ReactRoot): Promise<void> {
    try {
        await loadFlameSdk();
    } catch (error) {
        logger.error('Flame SDK failed to load', error);
    }

    root.render(
        <I18nextProvider i18n={i18n}>
            <AppProviders>
                <Root />
            </AppProviders>
        </I18nextProvider>
    );
}

void boot(createRoot(container));
