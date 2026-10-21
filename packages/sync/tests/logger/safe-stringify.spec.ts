import { describe, it, expect } from 'vitest';

import { safeStringify } from '../../src';

describe('safeStringify', () => {
    it('serializes plain data like JSON.stringify', () => {
        expect(safeStringify({ a: 1, b: 'x', c: [true, null] })).toBe(
            '{"a":1,"b":"x","c":[true,null]}'
        );
    });

    it('honours toJSON so an infra object collapses to its tag', () => {
        const logger = {
            toJSON: () => '[Logger]',
            transport: { context: ['one', 'two', 'three'] }
        };

        expect(safeStringify({ blockchain: 'BTC', btcApi: { logger } })).toBe(
            '{"blockchain":"BTC","btcApi":{"logger":"[Logger]"}}'
        );
    });

    it('caps depth beyond the limit', () => {
        const deep = { a: { b: { c: { d: 'too deep' } } } };

        expect(safeStringify(deep, { maxDepth: 2 })).toBe('{"a":{"b":"[Object]"}}');
    });

    it('turns a cycle into a marker instead of throwing', () => {
        const node: Record<string, unknown> = { name: 'node' };
        node.self = node;

        expect(safeStringify(node)).toBe('{"name":"node","self":"[Circular]"}');
    });

    it('keeps a shared reference, not treated as a cycle', () => {
        const shared = { id: 1 };

        expect(safeStringify({ a: shared, b: shared })).toBe('{"a":{"id":1},"b":{"id":1}}');
    });

    it('encodes bigint instead of throwing', () => {
        expect(safeStringify({ fee: 294n })).toBe('{"fee":"294"}');
    });

    it('replaces an oversized payload with a valid-JSON marker', () => {
        const big = { blob: 'x'.repeat(100) };
        const result = safeStringify(big, { maxLength: 32 });

        expect(JSON.parse(result)).toMatch(/^\[truncated: \d+ bytes\]$/);
    });
});
