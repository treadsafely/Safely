import { afterEach, describe, expect, it, vi } from 'vitest';

import { FLAME_RPC_ERROR_CODE, FlameApi, FlameApiError } from '../../../src';

const RPC_URL = 'http://flame.test/';
const PREDICATE = 'ab'.repeat(32);

const respond = (body: unknown) =>
    vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body))));

describe('FlameApi', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('posts a positional JSON-RPC scan and returns the validated result', async () => {
        const result = { tip_height: 42, outputs: [] };
        const fetchMock = respond({ jsonrpc: '2.0', id: 1, result });
        vi.stubGlobal('fetch', fetchMock);

        await expect(new FlameApi({ rpcUrl: RPC_URL }).scan([PREDICATE], 7)).resolves.toEqual(
            result
        );

        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe('http://flame.test/');
        expect(JSON.parse(init!.body as string)).toEqual({
            jsonrpc: '2.0',
            id: 1,
            method: 'scan',
            params: [[PREDICATE], 7]
        });
    });

    it('throws a FlameApiError carrying the JSON-RPC error code', async () => {
        vi.stubGlobal(
            'fetch',
            respond({
                jsonrpc: '2.0',
                id: 1,
                error: { code: FLAME_RPC_ERROR_CODE.LIMIT_EXCEEDED, message: 'too many' }
            })
        );

        const scan = new FlameApi({ rpcUrl: RPC_URL }).scan([PREDICATE]);

        await expect(scan).rejects.toBeInstanceOf(FlameApiError);
        await expect(scan).rejects.toMatchObject({
            message: 'too many',
            rpcCode: FLAME_RPC_ERROR_CODE.LIMIT_EXCEEDED
        });
    });

    it('rejects a result that does not match the scan schema', async () => {
        vi.stubGlobal(
            'fetch',
            respond({ jsonrpc: '2.0', id: 1, result: { tip_height: -1, outputs: [] } })
        );

        await expect(new FlameApi({ rpcUrl: RPC_URL }).scan([PREDICATE])).rejects.toBeInstanceOf(
            FlameApiError
        );
    });
});
