import { describe, expect, it } from 'vitest';

import type { LogEntry, ILogFileWriter } from '../../src';
import { FileTransport, LogLevel } from '../../src';

const META = { appVersion: '1.0.0', build: 'macos', device: 'MacBook, 15.0' };

const entry = (level: LogLevel, ...message: unknown[]): LogEntry => ({
    timestamp: new Date('2026-10-05T12:00:00.000Z'),
    level,
    path: ['main', 'test'],
    message
});

class CollectingSink implements ILogFileWriter {
    public writes: string[][] = [];

    public append(lines: string[]): void {
        this.writes.push(lines);
    }
}

describe('FileTransport', () => {
    it('keeps records below WARN in memory', () => {
        const sink = new CollectingSink();
        const transport = new FileTransport(sink, META);

        transport.log(entry(LogLevel.DEBUG, 'a'));
        transport.log(entry(LogLevel.INFO, 'b'));

        expect(sink.writes).toEqual([]);
    });

    it('writes a warning on its own', () => {
        const sink = new CollectingSink();
        const transport = new FileTransport(sink, META);

        transport.log(entry(LogLevel.INFO, 'context'));
        transport.log(entry(LogLevel.WARN, 'careful'));

        expect(sink.writes).toHaveLength(1);
        expect(sink.writes[0].map(line => FileTransport.parse(line)?.message)).toEqual(['careful']);
    });

    it('writes an error together with the context that led to it, once', () => {
        const sink = new CollectingSink();
        const transport = new FileTransport(sink, META);

        transport.log(entry(LogLevel.INFO, 'step 1'));
        transport.log(entry(LogLevel.DEBUG, 'step 2'));
        transport.log(entry(LogLevel.ERROR, 'boom', new Error('why')));
        transport.log(entry(LogLevel.ERROR, 'again'));

        const messages = sink.writes.map(lines =>
            lines.map(line => FileTransport.parse(line)?.message)
        );

        expect(messages[0]?.slice(0, 2)).toEqual(['step 1', 'step 2']);
        expect(messages[0]?.[2]).toContain('boom Error: why');
        expect(messages[1]).toEqual(['again']);
    });

    it('serializes the meta and the path into every record', () => {
        const sink = new CollectingSink();
        const transport = new FileTransport(sink, META);

        transport.log(entry(LogLevel.WARN, { nested: 1 }));

        expect(FileTransport.parse(sink.writes[0][0])).toEqual({
            timestamp: '2026-10-05T12:00:00.000Z',
            level: LogLevel.WARN,
            path: ['main', 'test'],
            message: '{"nested":1}',
            ...META
        });
    });

    it('forgets the context on reset, so an erase is not undone by the next error', () => {
        const sink = new CollectingSink();
        const transport = new FileTransport(sink, META);

        transport.log(entry(LogLevel.INFO, 'before erase'));
        transport.reset();
        transport.log(entry(LogLevel.ERROR, 'after erase'));

        expect(sink.writes[0].map(line => FileTransport.parse(line)?.message)).toEqual([
            'after erase'
        ]);
    });

    it('ignores lines that are not records', () => {
        expect(FileTransport.parse('')).toBeNull();
        expect(FileTransport.parse('not json')).toBeNull();
        expect(FileTransport.parse('{"t":"x"}')).toBeNull();
    });
});
