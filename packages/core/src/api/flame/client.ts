import type { z } from 'zod';

import type { Logger } from '@safely/sync';

import { FlameApiError } from './errors';
import type {
    FlameApiHistoryResult,
    FlameApiProof,
    FlameApiTxStatus,
    FlameApiUnspentResult
} from './models';
import {
    FlameHistoryResultSchema,
    FlameProofsResultSchema,
    FlameRpcResponseSchema,
    FlameSubmitTxResultSchema,
    FlameTxStatusSchema,
    FlameUnspentResultSchema
} from './models';
import { ApiClient } from '../../utils/fetch';
import type { IIdentifiable } from '../../utils/types';

export class FlameApi extends ApiClient implements IIdentifiable {
    protected readonly timeoutMs = 10_000;

    protected readonly errorConstructor = FlameApiError;

    public readonly id: string;

    private nextRequestId = 1;

    constructor(options: { rpcUrl: string; logger?: Logger }) {
        const rpcUrl = options.rpcUrl.replace(/\/$/, '');
        super('FlameApi', rpcUrl, {}, options.logger);

        this.id = `${this.apiName}:${rpcUrl}`;
    }

    public unspent(address: string, withPending = false): Promise<FlameApiUnspentResult> {
        return this.call('unspent', [address, withPending], FlameUnspentResultSchema);
    }

    public history(
        addresses: string[],
        page: { cursor: string | null; limit: number; withPending: boolean }
    ): Promise<FlameApiHistoryResult> {
        return this.call(
            'history',
            [addresses, page.cursor, page.limit, page.withPending],
            FlameHistoryResultSchema
        );
    }

    public async proofs(ids: string[]): Promise<FlameApiProof[]> {
        const pairs = await this.call('proofs', [ids], FlameProofsResultSchema);
        const byId = new Map(pairs);
        return ids.map(id => {
            const proof = byId.get(id);
            if (!proof) {
                throw new FlameApiError(`No proof served for ${id}`, 0);
            }
            return proof;
        });
    }

    public submitTx(blockTxBase64: string): Promise<string> {
        return this.call('submit_tx', [blockTxBase64], FlameSubmitTxResultSchema);
    }

    public txStatus(txid: string): Promise<FlameApiTxStatus> {
        return this.call('tx_status', [txid], FlameTxStatusSchema);
    }

    private async call<T extends z.ZodTypeAny>(
        method: string,
        params: unknown[],
        resultSchema: T
    ): Promise<z.infer<T>> {
        const response = await this.postJson(
            '',
            { jsonrpc: '2.0', id: this.nextRequestId++, method, params },
            FlameRpcResponseSchema
        );

        if ('error' in response) {
            const { message, data, code } = response.error;
            throw new FlameApiError(message, 0, data, code);
        }

        const result = resultSchema.safeParse(response.result);
        if (!result.success) {
            throw new FlameApiError(`Response validation failed: ${result.error.message}`, 0);
        }

        return result.data as z.infer<T>;
    }
}
