import { z } from 'zod';

const Hex32 = z.string().regex(/^[0-9a-f]{64}$/);

const Base64 = z.string().regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);

const U64 = z.number().int().nonnegative();

export const FlameUnspentEntrySchema = z.object({
    id: Hex32,
    bytes: Base64,
    note: Base64.optional()
});

export const FlameUnspentResultSchema = z.object({
    outputs: z.array(FlameUnspentEntrySchema)
});

export const FlameHistoryContractSchema = z.object({
    id: Hex32,
    predicate: Hex32,
    bytes: Base64,
    note: Base64.optional()
});

const FlameCounterpartySchema = z.object({
    predicate: Hex32,
    address: z.string().optional()
});

export const FlameHistoryEntrySchema = z.object({
    txid: Hex32,
    height: U64.optional(),
    time: U64.optional(),
    received_at: U64.optional(),
    fee_sparks: z.string().regex(/^\d+$/),
    created: z.array(FlameHistoryContractSchema),
    spent: z.array(FlameHistoryContractSchema),
    others_spent: z.array(FlameCounterpartySchema).default([]),
    others_created: z.array(FlameCounterpartySchema).default([])
});

export const FlameHistoryResultSchema = z.object({
    entries: z.array(FlameHistoryEntrySchema),
    older: z.string().nullable(),
    newer: z.string().nullable(),
    has_newer: z.boolean(),
    pending: z.array(FlameHistoryEntrySchema).optional(),
    pending_truncated: z.boolean().optional()
});

export const FlameProofSchema = z.discriminatedUnion('status', [
    z.object({ status: z.literal('unspent'), proof: Base64 }),
    z.object({ status: z.literal('spent'), height: U64, txid: Hex32 }),
    z.object({ status: z.literal('unknown') })
]);

export const FlameProofsResultSchema = z.array(z.tuple([Hex32, FlameProofSchema]));

export const FlameSubmitTxResultSchema = Hex32;

export const FlameTxStatusSchema = z.discriminatedUnion('status', [
    z.object({ status: z.literal('unknown') }),
    z.object({ status: z.literal('mempool') }),
    z.object({ status: z.literal('confirmed'), height: U64 })
]);

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

export type FlameApiUnspentEntry = z.infer<typeof FlameUnspentEntrySchema>;
export type FlameApiUnspentResult = z.infer<typeof FlameUnspentResultSchema>;
export type FlameApiHistoryContract = z.infer<typeof FlameHistoryContractSchema>;
export type FlameApiCounterparty = z.infer<typeof FlameCounterpartySchema>;
export type FlameApiHistoryEntry = z.infer<typeof FlameHistoryEntrySchema>;
export type FlameApiHistoryResult = z.infer<typeof FlameHistoryResultSchema>;
export type FlameApiProof = z.infer<typeof FlameProofSchema>;
export type FlameApiTxStatus = z.infer<typeof FlameTxStatusSchema>;
export type FlameApiRpcError = z.infer<typeof FlameRpcErrorSchema>;
