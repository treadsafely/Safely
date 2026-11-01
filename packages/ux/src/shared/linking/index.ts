import {
    intersectArrays,
    LinkingFailedToOpenError,
    LinkingUnsafeProtocolError
} from '@safely/core';
import type { Logger } from '@safely/sync';

export * from './deep-link-path';
export * from './define-deep-link-paths';

export enum LinkingProtocol {
    HTTPS = 'https:',
    MAILTO = 'mailto:',
    SAFELY_SCHEME = 'safely:',
    TG_SCHEME = 'tg:'
}

export abstract class Linking {
    protected readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger.child('linking');
    }

    protected abstract readonly authorizedOpenUrlProtocols: LinkingProtocol[];

    protected abstract openExternal(url: string): Promise<void>;
    protected abstract openInApp(url: string): Promise<void>;

    private isValidUrlProtocol(url: string, allowedProtocols?: LinkingProtocol[]): boolean {
        try {
            const allowed = allowedProtocols
                ? intersectArrays(this.authorizedOpenUrlProtocols, allowedProtocols)
                : this.authorizedOpenUrlProtocols;

            return allowed.includes(new URL(url).protocol as LinkingProtocol);
        } catch (e) {
            this.logger.error('Invalid URL protocol', e);
            return false;
        }
    }

    /*
     * @param url - The URL to open.
     * @param allowedProtocols - does not override authorized protocols. It will be intersected with authorized protocols
     * @throws {LinkingUnsafeProtocolError} If the URL protocol is not allowed.
     * @throws {LinkingFailedToOpenError} If the URL failed to open.
     */
    public async openURL(
        url: string,
        {
            allowedProtocols,
            preferInApp = false
        }: { allowedProtocols?: LinkingProtocol[]; preferInApp?: boolean } = {}
    ): Promise<void> {
        if (!this.isValidUrlProtocol(url, allowedProtocols)) {
            throw new LinkingUnsafeProtocolError();
        }

        try {
            if (preferInApp) {
                await this.openInApp(url);
                return;
            }

            await this.openExternal(url);
        } catch (e) {
            this.logger.error('Failed to open URL', e);
            throw new LinkingFailedToOpenError();
        }
    }
}
