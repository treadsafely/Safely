import { z } from 'zod';

/** Transaction output. */
const VoutSchema = z.object({
    /** List of addresses that are recipients of this output. */
    addresses: z.array(z.string()),
    /** Output amount expressed in satoshi. */
    value: z.string().optional(),
    /** True when this vout belongs to the queried address or any xpub-derived address. */
    isOwn: z.boolean().optional()
});

/** Transaction input. */
const VinSchema = z.object({
    /** Previous transaction that produced the spent output. */
    txid: z.string().optional(),
    /** Output index within the referenced transaction. */
    vout: z.number().optional(),
    /** Present only for coinbase inputs. */
    coinbase: z.string().optional(),
    /** List of addresses associated with this input. */
    addresses: z.array(z.string()).optional(),
    /** Amount (in satoshi) of the input. */
    value: z.string().optional(),
    /** True when this vin belongs to the queried address or any xpub-derived address. */
    isOwn: z.boolean().optional()
});

/** Transaction. */
export const TxSchema = z.object({
    /** Transaction ID (hash). */
    txid: z.string(),
    /** Array of inputs for this transaction. */
    vin: z.array(VinSchema),
    /** Array of outputs for this transaction. */
    vout: z.array(VoutSchema),
    /** Height of the block containing this transaction. -1 for unconfirmed. */
    blockHeight: z.number(),
    /** Number of confirmations. */
    confirmations: z.number(),
    /** Estimated blocks remaining until confirmation (if unconfirmed). */
    confirmationETABlocks: z.number().optional(),
    /** Unix timestamp of the block. */
    blockTime: z.number(),
    /** Transaction fee (in satoshi). */
    fees: z.string().optional(),
    /** Raw hex-encoded transaction data. May be omitted at lower detail levels. */
    hex: z.string().optional()
});

/** Transaction extended with the fiat rate requested via the `currency` parameter. */
export const TxWithBtcRateSchema = TxSchema.extend({
    /** Amount of the requested currency per 1 BTC around blockTime. Absent when unknown. */
    btcRate: z.number().optional()
});

/** Address / xpub aggregated data. */
export const AddressSchema = z.object({
    /** Current page index. */
    page: z.number().optional(),
    /** Number of items returned on this page. */
    itemsOnPage: z.number().optional(),
    /** Total number of pages available. */
    totalPages: z.number().optional(),
    /** Number of confirmed transactions. */
    txs: z.number(),
    /** Number of unconfirmed transactions. */
    unconfirmedTxs: z.number(),
    /** List of transaction IDs (when details=txids). */
    txids: z.array(z.string()).optional(),
    /** List of transaction details (when details=txs or txslight). */
    transactions: z.array(TxWithBtcRateSchema).optional()
});

/** UTXO. */
export const UtxoSchema = z.object({
    /** Transaction ID in which this UTXO was created. */
    txid: z.string(),
    /** Index of the output in that transaction. */
    vout: z.number(),
    /** Value of this UTXO in satoshi. */
    value: z.string(),
    /** Number of confirmations for this UTXO. */
    confirmations: z.number(),
    /** Address to which this UTXO belongs. */
    address: z.string().optional(),
    /** Derivation path for XPUB-based wallets. */
    path: z.string().optional(),
    /** Block height in which the UTXO was confirmed. */
    height: z.number().optional()
});

/** UTXO with optional full transaction data (when withPendingTxs=true). */
export const UtxoWithOptionalTxSchema = UtxoSchema.extend({
    tx: TxSchema.optional()
});

/** Raw transaction: a forward-compatible subset of Tx exposing only txid and hex. */
export const RawTxSchema = z.looseObject({
    txid: z.string(),
    hex: z.string()
});

export const BulkTxResponseSchema = z.object({
    transactions: z.array(RawTxSchema)
});

export const ChainTipSchema = z.object({
    height: z.number()
});

export const EstimatedFeeSchema = z.object({
    fee: z.number(),
    target_block: z.number().int()
});

export const EstimatedFeesSchema = z.object({
    fast_send: EstimatedFeeSchema,
    normal_send: EstimatedFeeSchema
});

export const SendTxResultSchema = z.object({
    result: z.string()
});

export type BtcApiAddress = z.infer<typeof AddressSchema>;
export type BtcApiUtxo = z.infer<typeof UtxoSchema>;
export type BtcApiUtxoWithOptionalTx = z.infer<typeof UtxoWithOptionalTxSchema>;
export type BtcApiEstimatedFee = z.infer<typeof EstimatedFeeSchema>;
export type BtcApiTx = z.infer<typeof TxSchema>;
export type BtcApiTxWithBtcRate = z.infer<typeof TxWithBtcRateSchema>;
export type BtcApiRawTx = z.infer<typeof RawTxSchema>;
