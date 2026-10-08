import { z } from 'zod';

const Hex32 = z.string().regex(/^[0-9a-f]{64}$/);

const Base64 = z.string().regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);

const U64 = z.number().int().nonnegative();

export const FlameSpentAtSchema = z.object({
    height: U64,
    txid: Hex32
});

export const FlameScanEntrySchema = z.object({
    id: Hex32,
    height: U64,
    txid: Hex32,
    predicate: Hex32,
    bytes: Base64,
    note: Base64.optional(),
    spent: FlameSpentAtSchema.optional()
});

export const FlameScanResultSchema = z.object({
    tip_height: U64,
    outputs: z.array(FlameScanEntrySchema)
});

export const FlameRpcErrorSchema = z.object({
    code: z.number().int(),
    message: z.string(),
    data: z.unknown().optional()
});

const rpcId = z.union([z.number(), z.string(), z.null()]);

export const FlameRpcResponseSchema = z.union([
    z.object({ jsonrpc: z.literal('2.0'), id: rpcId, result: z.unknown() }),
    z.object({ jsonrpc: z.literal('2.0'), id: rpcId, error: FlameRpcErrorSchema })
]);

export type FlameApiScanEntry = z.infer<typeof FlameScanEntrySchema>;
export type FlameApiScanResult = z.infer<typeof FlameScanResultSchema>;
export type FlameApiRpcError = z.infer<typeof FlameRpcErrorSchema>;
