import { afterEach, describe, expect, it, vi } from 'vitest';

import { FLAME_RPC_ERROR_CODE, FlameApi, FlameApiError } from '../../../src';

const RPC_URL = 'http://flame.test/';
const PREDICATE = 'ab'.repeat(32);
const ADDRESS = 'tf1address';

const respond = (body: unknown) =>
    vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body))));

describe('FlameApi', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('posts a positional JSON-RPC unspent call and returns the validated result', async () => {
        const result = {
            tip: { hash: 'cd'.repeat(32), height: 42, contract_root: 'ef'.repeat(32) },
            predicate: PREDICATE,
            outputs: [
                {
                    id: '01'.repeat(32),
                    txid: '02'.repeat(32),
                    bytes: 'AQID',
                    height: 40,
                    time: 9,
                    proof: 'BAU='
                },
                { id: '03'.repeat(32), txid: '04'.repeat(32), bytes: 'AQID', received_at: 10 }
            ]
        };
        const fetchMock = respond({ jsonrpc: '2.0', id: 1, result });
        vi.stubGlobal('fetch', fetchMock);

        await expect(new FlameApi({ rpcUrl: RPC_URL }).unspent(ADDRESS, true)).resolves.toEqual({
            outputs: [
                { id: '01'.repeat(32), bytes: 'AQID' },
                { id: '03'.repeat(32), bytes: 'AQID' }
            ]
        });

        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe('http://flame.test/');
        expect(JSON.parse(init!.body as string)).toEqual({
            jsonrpc: '2.0',
            id: 1,
            method: 'unspent',
            params: [ADDRESS, true]
        });
    });

    it('pages history by cursor and keeps the pending entries', async () => {
        const pending = [
            { txid: '05'.repeat(32), received_at: 11, fee_sparks: '1000', created: [], spent: [] }
        ];
        const result = {
            tip: { hash: 'cd'.repeat(32), height: 42, contract_root: 'ef'.repeat(32) },
            predicates: [PREDICATE],
            entries: [],
            older: null,
            newer: 'newer:42',
            has_newer: false,
            pending
        };
        const fetchMock = respond({ jsonrpc: '2.0', id: 1, result });
        vi.stubGlobal('fetch', fetchMock);

        const page = await new FlameApi({ rpcUrl: RPC_URL }).history([ADDRESS], {
            cursor: 'older:12:3',
            limit: 25,
            withPending: false
        });

        expect(page.pending).toEqual([{ ...pending[0], others_spent: [], others_created: [] }]);
        expect(page.older).toBeNull();
        expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toMatchObject({
            method: 'history',
            params: [[ADDRESS], 'older:12:3', 25, false]
        });
    });

    it('throws a FlameApiError carrying the JSON-RPC error code', async () => {
        vi.stubGlobal(
            'fetch',
            respond({
                jsonrpc: '2.0',
                id: 1,
                error: { code: FLAME_RPC_ERROR_CODE.INVALID_ADDRESS, message: 'bad address' }
            })
        );

        const unspent = new FlameApi({ rpcUrl: RPC_URL }).unspent(ADDRESS);

        await expect(unspent).rejects.toBeInstanceOf(FlameApiError);
        await expect(unspent).rejects.toMatchObject({
            message: 'bad address',
            rpcCode: FLAME_RPC_ERROR_CODE.INVALID_ADDRESS
        });
    });

    it('rejects a result that does not match the unspent schema', async () => {
        vi.stubGlobal(
            'fetch',
            respond({
                jsonrpc: '2.0',
                id: 1,
                result: { outputs: [{ id: 'x', bytes: 'AQID' }] }
            })
        );

        await expect(new FlameApi({ rpcUrl: RPC_URL }).unspent(ADDRESS)).rejects.toBeInstanceOf(
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
