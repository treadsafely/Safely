import type { ILoggerTransport } from './I-logger-transport';
import type { LogEntry } from './log-entry';

export class CombinedTransport implements ILoggerTransport {
    constructor(private readonly transports: ILoggerTransport[]) {}

    public toJSON(): string {
        return '[CombinedTransport]';
    }

    public log(entry: LogEntry): void {
        for (const transport of this.transports) {
            try {
                transport.log(entry);
            } catch (e) {
                console.error('[CombinedTransport] transport failed', e);
            }
        }
    }
}
