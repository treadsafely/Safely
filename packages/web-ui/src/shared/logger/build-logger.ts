import type { ILoggerTransport } from '@safely/core';
import { SanitizedTransport } from '@safely/core';
import {
    CombinedTransport,
    ConsoleTransport,
    Logger,
    LogLevel,
    logsFilterMinSeverityLevel
} from '@safely/sync';

export function buildWebLogger(isDev: boolean, transport: ILoggerTransport): { logger: Logger } {
    const transports: ILoggerTransport[] = [new SanitizedTransport(transport)];

    if (isDev) {
        transports.unshift(new ConsoleTransport());
    }

    const logger = new Logger(new CombinedTransport(transports));
    logger.setLogsFilter(logsFilterMinSeverityLevel(isDev ? LogLevel.TRACE : LogLevel.INFO));

    return { logger };
}
