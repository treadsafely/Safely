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

    it('requests proofs for every id and returns them in request order', async () => {
        const ids = ['01'.repeat(32), '02'.repeat(32), '03'.repeat(32)];
        const statuses = [
            { status: 'unspent', proof: 'AQID' },
            { status: 'spent', height: 9, txid: 'cd'.repeat(32) },
            { status: 'unknown' }
        ];
        const result = [
            [ids[2], statuses[2]],
            [ids[0], statuses[0]],
            [ids[1], statuses[1]]
        ];
        const fetchMock = respond({ jsonrpc: '2.0', id: 1, result });
        vi.stubGlobal('fetch', fetchMock);

        await expect(new FlameApi({ rpcUrl: RPC_URL }).proofs(ids)).resolves.toEqual(statuses);
        expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toMatchObject({
            method: 'proofs',
            params: [ids]
        });
    });

    it('rejects proofs that leave a requested id out', async () => {
        vi.stubGlobal(
            'fetch',
            respond({ jsonrpc: '2.0', id: 1, result: [['01'.repeat(32), { status: 'unknown' }]] })
        );

        await expect(
            new FlameApi({ rpcUrl: RPC_URL }).proofs(['01'.repeat(32), '02'.repeat(32)])
        ).rejects.toBeInstanceOf(FlameApiError);
    });

    it('submits a base64 block tx and returns the hex txid', async () => {
        const txid = 'ef'.repeat(32);
        const fetchMock = respond({ jsonrpc: '2.0', id: 1, result: txid });
        vi.stubGlobal('fetch', fetchMock);

        await expect(new FlameApi({ rpcUrl: RPC_URL }).submitTx('AQID')).resolves.toBe(txid);
        expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toMatchObject({
            method: 'submit_tx',
            params: ['AQID']
        });
    });

    it('reads a confirmed tx status', async () => {
        vi.stubGlobal(
            'fetch',
            respond({
                jsonrpc: '2.0',
                id: 1,
                result: { status: 'confirmed', height: 12, block: 'aa'.repeat(32) }
            })
        );

        await expect(new FlameApi({ rpcUrl: RPC_URL }).txStatus('ef'.repeat(32))).resolves.toEqual({
            status: 'confirmed',
            height: 12
        });
    });
});
