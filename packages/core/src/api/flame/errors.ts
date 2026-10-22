import { ApiError } from '../../utils/fetch';

export const FLAME_RPC_ERROR_CODE = {
    NOT_FOUND: -32001,
    MEMPOOL_REJECTED: -32002,
    LIMIT_EXCEEDED: -32003,
    INVALID_BYTES: -32004
} as const;

export class FlameApiError extends ApiError {
    public override readonly name = 'FlameApiError';

    public readonly rpcCode?: number;

    constructor(message: string, status: number, payload?: unknown, rpcCode?: number) {
        super(message, status, payload);
        this.rpcCode = rpcCode;
    }
}
