import { ConsoleTransport } from './console-transport';
import type { ILoggerTransport } from './I-logger-transport';
import type { LogEntry } from './log-entry';
import { LogLevel } from './log-level';
import type { LogsFilter } from './logs-filter';
import { logsFilterMinSeverityLevel } from './logs-filter';

export class Logger {
    private static nextSeq = 0;

    private readonly path: string[] = [];
    private logsFilter: LogsFilter = logsFilterMinSeverityLevel(LogLevel.INFO);

    constructor(private readonly transport: ILoggerTransport = new ConsoleTransport()) {}

    public toJSON(): string {
        return '[Logger]';
    }

    public setLogsFilter(filter: LogsFilter): void {
        this.logsFilter = filter;
    }

    public child(name: string): Logger {
        const childLogger = new Logger(this.transport);
        childLogger.path.push(...this.path, name);
        childLogger.logsFilter = this.logsFilter;

        return childLogger;
    }

    public trace(...args: unknown[]): void {
        this.dispatch(LogLevel.TRACE, args);
    }

    public debug(...args: unknown[]): void {
        this.dispatch(LogLevel.DEBUG, args);
    }

    public log(...args: unknown[]): void {
        this.dispatch(LogLevel.INFO, args);
    }

    public info(...args: unknown[]): void {
        this.dispatch(LogLevel.INFO, args);
    }

    public warn(...args: unknown[]): void {
        this.dispatch(LogLevel.WARN, args);
    }

    public error(...args: unknown[]): void {
        this.dispatch(LogLevel.ERROR, args);
    }

    private dispatch(level: LogLevel, args: unknown[]): void {
        const entry: LogEntry = {
            timestamp: new Date(),
            seq: Logger.nextSeq++,
            level,
            path: [...this.path],
            message: args
        };

        if (!this.logsFilter(entry)) {
            return;
        }

        try {
            this.transport.log(entry);
        } catch (e) {
            console.error('[Logger] transport failed', e);
        }
    }
}
