import type { BrowserWindow } from 'electron';
import { app } from 'electron';

import type { Logger } from '@safely/sync';

import { DEEP_LINK_MAX_LENGTH, IPC_CHANNEL } from '../shared/ipc';

const BROWSING_WEB_ACTIVITY = 'NSUserActivityTypeBrowsingWeb';

export class DeepLinkReceiver {
    private pendingUrl: string | null = null;

    constructor(
        private readonly logger: Logger,
        private readonly getWindow: () => BrowserWindow | null,
        private readonly revealWindow: () => void
    ) {}

    public listen(): void {
        app.on('open-url', (event, url) => {
            event.preventDefault();
            this.receive(url);
        });

        app.on('continue-activity', (event, type, _userInfo, details) => {
            if (type !== BROWSING_WEB_ACTIVITY || details.webpageURL === undefined) {
                return;
            }

            event.preventDefault();
            this.receive(details.webpageURL);
        });
    }

    public take(): string | null {
        const url = this.pendingUrl;

        this.pendingUrl = null;

        return url;
    }

    private receive(url: string): void {
        if (url.length > DEEP_LINK_MAX_LENGTH) {
            this.logger.warn('deep link dropped: longer than the limit');
            return;
        }

        this.pendingUrl = url;

        const window = this.getWindow();

        if (window === null) {
            return;
        }

        window.webContents.send(IPC_CHANNEL.deepLink.received);
        this.revealWindow();
    }
}
