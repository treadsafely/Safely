import type { ILoggerTransport } from './I-logger-transport';
import type { LogEntry } from './log-entry';
import { LogLevel } from './log-level';

export class ConsoleTransport implements ILoggerTransport {
    public toJSON(): string {
        return '[ConsoleTransport]';
    }

    public log(entry: LogEntry): void {
        const levelStr = LogLevel[entry.level].padStart(5);
        const pathStr = entry.path.length > 0 ? ` [${entry.path.join('>')}]` : '';
        const prefix = `[${levelStr}] [${entry.timestamp.toISOString()}]${pathStr}`;

        const method =
            entry.level === LogLevel.ERROR
                ? console.error
                : entry.level === LogLevel.WARN
                  ? console.warn
                  : console.log;

        method(prefix, ...entry.message);
    }
}
