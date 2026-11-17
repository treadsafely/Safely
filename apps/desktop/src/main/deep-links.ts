import type { BrowserWindow } from 'electron';
import { app } from 'electron';

import type { Logger } from '@safely/sync';
import { APP_URL_SCHEME } from '@safely/ux/deep-link';

import { DEEP_LINK_MAX_LENGTH, IPC_CHANNEL } from '../shared/ipc';

const BROWSING_WEB_ACTIVITY = 'NSUserActivityTypeBrowsingWeb';

/* on Windows the OS passes the link as a process argument; anything else on the line is not a link */
export function findDeepLinkArgument(argv: readonly string[]): string | null {
    const prefix = `${APP_URL_SCHEME}:`;

    for (const argument of argv.slice(1)) {
        if (!argument.startsWith(prefix)) {
            continue;
        }

        try {
            return new URL(argument).protocol === prefix ? argument : null;
        } catch {
            return null;
        }
    }

    return null;
}

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

        this.receiveArguments(process.argv);
    }

    public receiveArguments(argv: readonly string[]): void {
        const url = findDeepLinkArgument(argv);

        if (url !== null) {
            this.receive(url);
        }
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
