import type { ILoggerTransport } from '@safely/core';
import { SanitizedTransport } from '@safely/core';
import {
    CombinedTransport,
    ConsoleTransport,
    Logger,
    LogLevel,
    logsFilterMinSeverityLevel
} from '@safely/sync';

export function buildLogger(fileTransport: ILoggerTransport, isDev: boolean): Logger {
    let filter;
    let transport: ILoggerTransport;

    if (isDev) {
        transport = new CombinedTransport([
            new ConsoleTransport(),
            new SanitizedTransport(fileTransport)
        ]);
        filter = logsFilterMinSeverityLevel(LogLevel.TRACE);
    } else {
        transport = new SanitizedTransport(fileTransport);
        filter = logsFilterMinSeverityLevel(LogLevel.INFO);
    }

    const logger = new Logger(transport);
    logger.setLogsFilter(filter);

    return logger;
}
