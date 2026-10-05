/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';

import type { ILoggerTransport, LogEntry } from '../../src';
import { CombinedTransport, LogLevel } from '../../src';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
    return {
        timestamp: new Date('2026-04-07T12:00:00.000Z'),
        level: LogLevel.INFO,
        path: [],
        message: ['test message'],
        ...overrides
    };
}

function createMockTransport(): ILoggerTransport & {
    log: ReturnType<typeof vi.fn<(entry: LogEntry) => void>>;
} {
    return { log: vi.fn<(entry: LogEntry) => void>() };
}

describe('CombinedTransport', () => {
    describe('delegation', () => {
        it('should call log on every transport', () => {
            const t1 = createMockTransport();
            const t2 = createMockTransport();
            const t3 = createMockTransport();
            const combined = new CombinedTransport([t1, t2, t3]);
            const entry = makeEntry();

            combined.log(entry);

            expect(t1.log).toHaveBeenCalledOnce();
            expect(t2.log).toHaveBeenCalledOnce();
            expect(t3.log).toHaveBeenCalledOnce();
        });

        it('should pass the same entry reference to all transports', () => {
            const t1 = createMockTransport();
            const t2 = createMockTransport();
            const combined = new CombinedTransport([t1, t2]);
            const entry = makeEntry();

            combined.log(entry);

            expect(t1.log).toHaveBeenCalledWith(entry);
            expect(t2.log).toHaveBeenCalledWith(entry);
            expect(t1.log.mock.calls[0][0]).toBe(t2.log.mock.calls[0][0]);
        });

        it('should call transports in order', () => {
            const callOrder: number[] = [];
            const t1: ILoggerTransport = { log: () => callOrder.push(1) };
            const t2: ILoggerTransport = { log: () => callOrder.push(2) };
            const t3: ILoggerTransport = { log: () => callOrder.push(3) };
            const combined = new CombinedTransport([t1, t2, t3]);

            combined.log(makeEntry());

            expect(callOrder).toEqual([1, 2, 3]);
        });
    });

    describe('failure isolation', () => {
        it('should continue calling remaining transports when one throws', () => {
            const t1 = createMockTransport();
            const failing: ILoggerTransport = {
                log() {
                    throw new Error('boom');
                }
            };
            const t3 = createMockTransport();
            const combined = new CombinedTransport([t1, failing, t3]);

            combined.log(makeEntry());

            expect(t1.log).toHaveBeenCalledOnce();
            expect(t3.log).toHaveBeenCalledOnce();
        });

        it('should not throw when all transports throw', () => {
            const failing1: ILoggerTransport = {
                log() {
                    throw new Error('fail 1');
                }
            };
            const failing2: ILoggerTransport = {
                log() {
                    throw new Error('fail 2');
                }
            };
            const combined = new CombinedTransport([failing1, failing2]);

            expect(() => combined.log(makeEntry())).not.toThrow();
        });
    });

    describe('empty transports', () => {
        it('should not throw when constructed with no transports', () => {
            const combined = new CombinedTransport([]);

            expect(() => combined.log(makeEntry())).not.toThrow();
        });
    });

    describe('single transport', () => {
        it('should delegate to a single transport', () => {
            const t = createMockTransport();
            const combined = new CombinedTransport([t]);
            const entry = makeEntry({ level: LogLevel.ERROR, message: ['critical'] });

            combined.log(entry);

            expect(t.log).toHaveBeenCalledWith(entry);
        });
    });
});
