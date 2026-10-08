import { z } from 'zod';

import type { ILogFileWriter } from './I-log-file-writer';
import type { ILoggerTransport } from './I-logger-transport';
import type { LogEntry } from './log-entry';
import { LogLevel } from './log-level';
import type { LogMeta, LogRecord } from './log-record';

const CONTEXT_BUFFER_SIZE = 1000;

const sStoredLog = z.object({
    t: z.string(),
    l: z.enum(LogLevel),
    p: z.array(z.string()),
    m: z.string(),
    v: z.string(),
    b: z.string(),
    d: z.string()
});

type StoredLog = z.infer<typeof sStoredLog>;

export class FileTransport implements ILoggerTransport {
    private context: string[] = [];

    constructor(
        private readonly writer: ILogFileWriter,
        private readonly meta: LogMeta
    ) {}

    public static parse(line: string): LogRecord | null {
        if (!line) return null;

        let parsed: unknown;
        try {
            parsed = JSON.parse(line);
        } catch {
            return null;
        }

        const result = sStoredLog.safeParse(parsed);
        if (!result.success) return null;

        const stored = result.data;

        return {
            timestamp: stored.t,
            level: stored.l,
            path: stored.p,
            message: stored.m,
            appVersion: stored.v,
            build: stored.b,
            device: stored.d
        };
    }

    public log(entry: LogEntry): void {
        const serialized = this.serialize(entry);

        if (entry.level < LogLevel.WARN) {
            this.context.push(serialized);

            if (this.context.length > CONTEXT_BUFFER_SIZE) {
                this.context.shift();
            }

            return;
        }

        if (entry.level >= LogLevel.ERROR) {
            this.writer.append([...this.context, serialized]);
            this.context = [];

            return;
        }

        this.writer.append([serialized]);
    }

    public reset(): void {
        this.context = [];
    }

    private serialize(entry: LogEntry): string {
        const stored: StoredLog = {
            t: entry.timestamp.toISOString(),
            l: entry.level,
            p: entry.path,
            m: entry.message.map(message => this.serializeMessage(message)).join(' '),
            v: this.meta.appVersion,
            b: this.meta.build,
            d: this.meta.device
        };

        return JSON.stringify(stored);
    }

    private serializeMessage(message: unknown): string {
        if (typeof message === 'string') return message;
        if (message instanceof Error) return message.stack ?? message.message;

        try {
            return JSON.stringify(message);
        } catch {
            return String(message);
        }
    }
}
