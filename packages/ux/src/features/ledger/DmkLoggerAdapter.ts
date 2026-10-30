import { LogLevel } from '@ledgerhq/device-management-kit';
import type { LoggerSubscriberService } from '@ledgerhq/device-management-kit';

import type { Logger } from '@safely/sync';

export class DmkLoggerAdapter implements LoggerSubscriberService {
    constructor(private readonly logger: Logger) {}

    public log(...[level, message, options]: Parameters<LoggerSubscriberService['log']>): void {
        const text = `${options.tag} ${message}`;
        const args = options.data ? [text, options.data] : [text];

        switch (level) {
            case LogLevel.Fatal:
            case LogLevel.Error:
                this.logger.error(...args);
                return;
            case LogLevel.Warning:
                this.logger.warn(...args);
                return;
            case LogLevel.Info:
                this.logger.info(...args);
                return;
            default:
                this.logger.debug(...args);
        }
    }
}
