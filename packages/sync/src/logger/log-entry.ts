import type { LogLevel } from './log-level';

export interface LogEntry {
    timestamp: Date;
    seq: number;
    level: LogLevel;
    path: string[];
    message: unknown[];
}
