import type { Logger } from '@safely/sync';
import { Linking, LinkingProtocol } from '@safely/ux';

/** Every link leaves the wallet: hosting foreign content in the renderer would put it next to the keys. */
export class WebLinking extends Linking {
    protected readonly authorizedOpenUrlProtocols = [
        LinkingProtocol.HTTPS,
        LinkingProtocol.MAILTO,
        LinkingProtocol.TG_SCHEME
    ];

    constructor(
        logger: Logger,
        private readonly openUrl: (url: string) => Promise<void>
    ) {
        super(logger);
    }

    protected openExternal(url: string): Promise<void> {
        return this.openUrl(url);
    }

    protected openInApp(url: string): Promise<void> {
        return this.openUrl(url);
    }
}
