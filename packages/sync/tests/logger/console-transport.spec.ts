import { describe, it, expect, vi, afterEach } from 'vitest';

import type { LogEntry } from '../../src';
import { ConsoleTransport, LogLevel } from '../../src';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
    return {
        timestamp: new Date('2026-04-07T12:00:00.000Z'),
        seq: 0,
        level: LogLevel.INFO,
        path: [],
        message: ['test message'],
        ...overrides
    };
}

describe('ConsoleTransport', () => {
    const transport = new ConsoleTransport();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    afterEach(() => {
        logSpy.mockClear();
        warnSpy.mockClear();
        errorSpy.mockClear();
    });

    describe('routing', () => {
        it('should route ERROR to console.error', () => {
            transport.log(makeEntry({ level: LogLevel.ERROR }));
            expect(errorSpy).toHaveBeenCalledOnce();
            expect(logSpy).not.toHaveBeenCalled();
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('should route WARN to console.warn', () => {
            transport.log(makeEntry({ level: LogLevel.WARN }));
            expect(warnSpy).toHaveBeenCalledOnce();
            expect(logSpy).not.toHaveBeenCalled();
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('should route TRACE to console.log', () => {
            transport.log(makeEntry({ level: LogLevel.TRACE }));
            expect(logSpy).toHaveBeenCalledOnce();
        });

        it('should route DEBUG to console.log', () => {
            transport.log(makeEntry({ level: LogLevel.DEBUG }));
            expect(logSpy).toHaveBeenCalledOnce();
        });

        it('should route INFO to console.log', () => {
            transport.log(makeEntry({ level: LogLevel.INFO }));
            expect(logSpy).toHaveBeenCalledOnce();
        });
    });

    describe('prefix formatting', () => {
        it('should pad level string to 5 chars', () => {
            transport.log(makeEntry({ level: LogLevel.INFO }));
            const prefix = logSpy.mock.calls[0][0] as string;
            expect(prefix).toContain('[ INFO]');
        });

        it('should not pad 5-char level names', () => {
            transport.log(makeEntry({ level: LogLevel.TRACE }));
            const prefix = logSpy.mock.calls[0][0] as string;
            expect(prefix).toContain('[TRACE]');
        });

        it('should include timestamp as ISO string', () => {
            transport.log(makeEntry({ timestamp: new Date('2026-01-15T10:30:00.000Z') }));
            const prefix = logSpy.mock.calls[0][0] as string;
            expect(prefix).toContain('[2026-01-15T10:30:00.000Z]');
        });

        it('should include path joined by >', () => {
            transport.log(makeEntry({ path: ['sync', 'account', 'ab12'] }));
            const prefix = logSpy.mock.calls[0][0] as string;
            expect(prefix).toContain('[sync>account>ab12]');
        });

        it('should omit path section when path is empty', () => {
            transport.log(makeEntry({ path: [] }));
            const prefix = logSpy.mock.calls[0][0] as string;
            const afterTimestamp = prefix.split(']').slice(2).join(']');
            expect(afterTimestamp).not.toContain('[');
        });
    });

    describe('message handling', () => {
        it('should spread message array as arguments after prefix', () => {
            transport.log(makeEntry({ message: ['hello', 42, { x: 1 }] }));
            expect(logSpy.mock.calls[0][1]).toBe('hello');
            expect(logSpy.mock.calls[0][2]).toBe(42);
            expect(logSpy.mock.calls[0][3]).toEqual({ x: 1 });
        });

        it('should spread single-element array', () => {
            transport.log(makeEntry({ message: ['hello world'] }));
            expect(logSpy.mock.calls[0][1]).toBe('hello world');
        });

        it('should handle empty message array', () => {
            transport.log(makeEntry({ message: [] }));
            expect(logSpy.mock.calls[0]).toHaveLength(1);
        });
    });
});
