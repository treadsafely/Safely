import type { ILoggerTransport, LogEntry } from '@safely/sync';

import { filterSensitiveData } from './sensitive-filter';

export class SanitizedTransport implements ILoggerTransport {
    constructor(private readonly inner: ILoggerTransport) {}

    public log(entry: LogEntry): void {
        this.inner.log({
            ...entry,
            message: entry.message.map(filterSensitiveValue)
        });
    }
}

function filterSensitiveValue(value: unknown): unknown {
    if (typeof value === 'string') return filterSensitiveData(value);

    if (value instanceof Error) {
        const filtered = new Error(filterSensitiveData(value.message));

        if (value.stack) {
            filtered.stack = filterSensitiveData(value.stack);
        }

        return filtered;
    }

    if (typeof value === 'object' && value !== null) {
        try {
            const json = JSON.stringify(value);
            const sanitized = filterSensitiveData(json);

            return JSON.parse(sanitized);
        } catch {
            return '[Object: sanitization failed]';
        }
    }

    return value;
}
