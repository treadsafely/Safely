/* Must stay the first import: it installs the globals the domain packages read at load time. */
import './global-polyfills';

import { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import '@safely/web-ui/styles.css';

import { App, AppProviders } from './app';
import { i18n } from './i18n';
import { platform } from './platform';

const container = document.getElementById('root');

if (!container) {
    throw new Error('Renderer root element is missing in index.html');
}

function Root() {
    const isFullScreen = useSyncExternalStore(
        platform.subscribeFullScreen,
        platform.getIsFullScreen
    );

    return <App hasWindowControls={!isFullScreen} isFullScreen={isFullScreen} />;
}

createRoot(container).render(
    <I18nextProvider i18n={i18n}>
        <AppProviders>
            <Root />
        </AppProviders>
    </I18nextProvider>
);
