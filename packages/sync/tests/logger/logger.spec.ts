import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { ILoggerTransport, LogEntry } from '../../src';
import { LogLevel, Logger, logsFilterMinSeverityLevel } from '../../src';

function createMockTransport(): ILoggerTransport & { entries: LogEntry[] } {
    const transport = {
        entries: [] as LogEntry[],
        log(entry: LogEntry) {
            transport.entries.push(entry);
        }
    };

    return transport;
}

describe('Logger', () => {
    let transport: ReturnType<typeof createMockTransport>;
    let logger: Logger;

    beforeEach(() => {
        transport = createMockTransport();
        logger = new Logger(transport);
    });

    describe('level filtering', () => {
        it('should dispatch entries at or above the current level', () => {
            logger.setLogsFilter(logsFilterMinSeverityLevel(LogLevel.WARN));
            logger.warn('w');
            logger.error('e');
            expect(transport.entries).toHaveLength(2);
        });

        it('should suppress entries below the current level', () => {
            logger.setLogsFilter(logsFilterMinSeverityLevel(LogLevel.WARN));
            logger.trace('t');
            logger.debug('d');
            logger.info('i');
            expect(transport.entries).toHaveLength(0);
        });

        it('should default to INFO level', () => {
            logger.trace('t');
            logger.debug('d');
            logger.info('i');
            expect(transport.entries).toHaveLength(1);
            expect(transport.entries[0].level).toBe(LogLevel.INFO);
        });

        it('should respect setLogsFilter changes after construction', () => {
            logger.setLogsFilter(logsFilterMinSeverityLevel(LogLevel.TRACE));
            logger.trace('t');
            expect(transport.entries).toHaveLength(1);

            logger.setLogsFilter(logsFilterMinSeverityLevel(LogLevel.ERROR));
            logger.warn('w');
            expect(transport.entries).toHaveLength(1);
        });
    });

    describe('custom filter', () => {
        it('should support arbitrary predicate', () => {
            logger.setLogsFilter(
                (entry: LogEntry) => entry.level >= LogLevel.INFO && entry.path[0] === 'sync'
            );
            logger.info('root msg');
            expect(transport.entries).toHaveLength(0);

            const child = logger.child('sync');
            child.info('sync msg');
            expect(transport.entries).toHaveLength(1);
        });
    });

    describe('message passing', () => {
        beforeEach(() => {
            logger.setLogsFilter(logsFilterMinSeverityLevel(LogLevel.TRACE));
        });

        it('should wrap single argument in array', () => {
            logger.trace('hello world');
            expect(transport.entries[0].message).toEqual(['hello world']);
        });

        it('should preserve object references in array', () => {
            const obj = { a: 1 };
            logger.trace(obj);
            expect(transport.entries[0].message).toEqual([obj]);
            expect(transport.entries[0].message[0]).toBe(obj);
        });

        it('should preserve Error in array', () => {
            const err = new Error('test error');
            logger.trace(err);
            expect(transport.entries[0].message).toEqual([err]);
        });

        it('should pass multiple arguments as array', () => {
            logger.trace('hello', 'world', 42);
            expect(transport.entries[0].message).toEqual(['hello', 'world', 42]);
        });

        it('should pass empty array for zero args', () => {
            logger.trace();
            expect(transport.entries[0].message).toEqual([]);
        });
    });

    describe('entry structure', () => {
        it('should set timestamp as Date', () => {
            logger.info('msg');
            expect(transport.entries[0].timestamp).toBeInstanceOf(Date);
        });

        it('should set correct level', () => {
            logger.warn('msg');
            expect(transport.entries[0].level).toBe(LogLevel.WARN);
        });
    });

    describe('transport delegation', () => {
        it('should use ConsoleTransport by default when no transport given', () => {
            const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const defaultLogger = new Logger();
            defaultLogger.info('test');
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should swallow transport errors', () => {
            const badTransport: ILoggerTransport = {
                log() {
                    throw new Error('boom');
                }
            };
            const safe = new Logger(badTransport);
            expect(() => safe.info('msg')).not.toThrow();
        });

        it('should pass a copy of path array in the entry', () => {
            const child = logger.child('a');
            child.info('msg');
            const entryPath = transport.entries[0].path;
            entryPath.push('mutated');
            child.info('msg2');
            expect(transport.entries[1].path).toEqual(['a']);
        });
    });

    describe('child', () => {
        it('should append name to parent path', () => {
            logger.setLogsFilter(logsFilterMinSeverityLevel(LogLevel.TRACE));
            const child = logger.child('svc');
            child.trace('msg');
            expect(transport.entries[0].path).toEqual(['svc']);
        });

        it('should support multi-level nesting', () => {
            logger.setLogsFilter(logsFilterMinSeverityLevel(LogLevel.TRACE));
            const child = logger.child('a').child('b').child('c');
            child.trace('msg');
            expect(transport.entries[0].path).toEqual(['a', 'b', 'c']);
        });

        it('should share transport with parent', () => {
            const child = logger.child('x');
            child.info('msg');
            expect(transport.entries).toHaveLength(1);
        });

        it('should inherit parent filter', () => {
            logger.setLogsFilter(logsFilterMinSeverityLevel(LogLevel.ERROR));
            const child = logger.child('x');
            child.warn('msg');
            expect(transport.entries).toHaveLength(0);
            child.error('msg');
            expect(transport.entries).toHaveLength(1);
        });

        it('should not mutate parent path', () => {
            logger.setLogsFilter(logsFilterMinSeverityLevel(LogLevel.TRACE));
            logger.child('a');
            logger.trace('msg');
            expect(transport.entries[0].path).toEqual([]);
        });
    });

    describe('convenience methods', () => {
        beforeEach(() => {
            logger.setLogsFilter(logsFilterMinSeverityLevel(LogLevel.TRACE));
        });

        it('should dispatch TRACE via trace()', () => {
            logger.trace('t');
            expect(transport.entries[0].level).toBe(LogLevel.TRACE);
        });

        it('should dispatch DEBUG via debug()', () => {
            logger.debug('d');
            expect(transport.entries[0].level).toBe(LogLevel.DEBUG);
        });

        it('should dispatch INFO via log()', () => {
            logger.log('l');
            expect(transport.entries[0].level).toBe(LogLevel.INFO);
        });

        it('should dispatch INFO via info()', () => {
            logger.info('i');
            expect(transport.entries[0].level).toBe(LogLevel.INFO);
        });

        it('should dispatch WARN via warn()', () => {
            logger.warn('w');
            expect(transport.entries[0].level).toBe(LogLevel.WARN);
        });

        it('should dispatch ERROR via error()', () => {
            logger.error('e');
            expect(transport.entries[0].level).toBe(LogLevel.ERROR);
        });
    });

    describe('sequence', () => {
        it('stamps a strictly increasing seq across calls and child loggers', () => {
            const child = logger.child('child');

            logger.info('a');
            child.info('b');
            logger.info('c');

            const [first, second, third] = transport.entries.map(entry => entry.seq);
            expect(second).toBeGreaterThan(first);
            expect(third).toBeGreaterThan(second);
        });
    });
});
