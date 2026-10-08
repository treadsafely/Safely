import { BrowserWindow } from 'electron';
import path from 'node:path';

import { darkTheme } from '@safely/ux/theme';

import { appUrl } from './app-protocol';
import { mainLogger } from './logger';
import type { AppInfo } from '../shared/app-info';
import { encodeAppInfoArgument } from '../shared/app-info';

const RENDERER_LOG_LEVEL = {
    error: 'error',
    warning: 'warning'
} as const;

const WINDOW = {
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640
};

export function createMainWindow(
    devServerUrl: string | undefined,
    appInfo: AppInfo
): BrowserWindow {
    const window = new BrowserWindow({
        ...WINDOW,
        show: false,
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 19, y: 19 },
        /* from the design tokens, so the window never flashes white before the first frame */
        backgroundColor: darkTheme.colors.background.primary,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            /* The renderer needs `appInfo` before its first line runs, so it arrives in the
               preload's argv instead of over a channel. */
            additionalArguments: [encodeAppInfoArgument(appInfo)],
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true
        }
    });

    window.once('ready-to-show', () => {
        window.show();
    });

    /* The renderer logs to its devtools console, invisible from a terminal — forward it so a
       renderer that dies during boot stays diagnosable. */
    window.webContents.on('console-message', event => {
        const scoped = mainLogger.child('renderer');
        const location = `${event.sourceId}:${event.lineNumber}`;

        if (event.level === RENDERER_LOG_LEVEL.error) {
            scoped.error(event.message, location);
        } else if (event.level === RENDERER_LOG_LEVEL.warning) {
            scoped.warn(event.message, location);
        } else if (devServerUrl) {
            scoped.debug(event.message, location);
        }
    });

    window.webContents.on('render-process-gone', (_event, details) => {
        mainLogger.error('renderer process gone', details.reason, details.exitCode);
    });

    window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, url) => {
        mainLogger.error('renderer failed to load', url, errorCode, errorDescription);
    });

    void window.loadURL(devServerUrl ?? appUrl('/index.html'));

    return window;
}
