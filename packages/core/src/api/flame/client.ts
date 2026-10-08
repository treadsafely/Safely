import type { z } from 'zod';

import type { Logger } from '@safely/sync';

import { FlameApiError } from './errors';
import type { FlameApiScanResult } from './models';
import { FlameRpcResponseSchema, FlameScanResultSchema } from './models';
import { ApiClient } from '../../utils/fetch';
import type { IIdentifiable } from '../../utils/types';

export class FlameApi extends ApiClient implements IIdentifiable {
    protected readonly timeoutMs = 10_000;

    protected readonly errorConstructor = FlameApiError;

    public readonly id: string;

    private nextRequestId = 1;

    constructor(options: { rpcUrl: string; logger?: Logger }) {
        const rpcUrl = options.rpcUrl.replace(/\/$/, '');
        super(rpcUrl, {}, options.logger);

        this.id = `${this.constructor.name}:${rpcUrl}`;
    }

    public scan(predicates: string[], sinceHeight = 0): Promise<FlameApiScanResult> {
        return this.call('scan', [predicates, sinceHeight], FlameScanResultSchema);
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
