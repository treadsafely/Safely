import type { LogRecord } from './log-record';

export function compareLogRecords(a: LogRecord, b: LogRecord): number {
    if (a.timestamp !== b.timestamp) {
        return a.timestamp < b.timestamp ? -1 : 1;
    }

    return (a.seq ?? 0) - (b.seq ?? 0);
}
