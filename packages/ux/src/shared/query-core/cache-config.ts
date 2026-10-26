import { z } from 'zod';

import { aboutSchema, bootConfigSchema, sCryptoAssetAmount, sCryptoFiatRate } from '@safely/core';
import { UtxoSchema, UtxoWithOptionalTxSchema } from '@safely/core/api/btc';
import { providersSchema, rampOrderSchema } from '@safely/core/api/exchange';
import { FlameUnspentEntrySchema } from '@safely/core/api/flame';
import { HistoricalPriceSchema } from '@safely/core/api/price';

const sBtcActivityItem = z.object({
    type: z.literal('transaction'),
    timestamp: z.number(),
    key: z.string(),
    transaction: z.object({
        isInitiator: z.boolean(),
        fromAddress: z.string(),
        toAddress: z.string(),
        value: sCryptoAssetAmount,
        fee: z
            .object({
                type: z.literal('crypto'),
                amount: sCryptoAssetAmount
            })
            .optional(),
        rate: sCryptoFiatRate,
        raw: z.unknown()
    })
});

const sOrderActivityItem = z.object({
    type: z.literal('order'),
    timestamp: z.number(),
    key: z.string(),
    order: rampOrderSchema,
    cryptoAmount: sCryptoAssetAmount.nullable()
});

const sActivityItem = z.discriminatedUnion('type', [sBtcActivityItem, sOrderActivityItem]);

const sInfiniteActivityData = z.object({
    pages: z.array(
        z.object({
            items: z.array(sActivityItem),
            btcNextPage: z.number().nullable(),
            ordersNextCursor: z.string().nullable()
        })
    ),
    pageParams: z.array(z.unknown())
});

const sFlameOutputAmount = z.discriminatedUnion('status', [
    z.object({
        status: z.literal('counted'),
        qty: z.bigint(),
        flavor: z.string(),
        isNative: z.boolean(),
        memo: z.string().optional()
    }),
    z.object({ status: z.literal('unreadable') }),
    z.object({ status: z.literal('flagged') }),
    z.object({ status: z.literal('notToken') })
]);

export const cacheSchemas = {
    sBtcWalletUtxos: z.object({
        confirmed: z.object({
            totalAmount: sCryptoAssetAmount,
            utxos: z.array(UtxoSchema)
        }),
        unconfirmedSafe: z.object({
            totalAmount: sCryptoAssetAmount,
            utxos: z.array(UtxoWithOptionalTxSchema)
        }),
        unconfirmedUnsafe: z.object({
            totalAmount: sCryptoAssetAmount,
            utxos: z.array(UtxoWithOptionalTxSchema)
        }),
        hasLocalNotBroadcastedCache: z.boolean()
    }),
    sFlameWalletUnspent: z.object({
        entries: z.array(FlameUnspentEntrySchema),
        amounts: z.record(z.string(), sFlameOutputAmount)
    }),
    bootConfig: bootConfigSchema,
    about: aboutSchema,
    exchangeProviders: providersSchema,
    infiniteActivityData: sInfiniteActivityData,
    sHistoricalPrice: HistoricalPriceSchema,
    sCryptoFiatRate: sCryptoFiatRate
} satisfies Record<string, z.ZodType>;

export type CacheSchemaKey = keyof typeof cacheSchemas;

// a memo is sealed to the wallet's view key, so its plaintext stays in memory and never reaches disk
function withoutFlameMemos(data: unknown): unknown {
    const unspent = cacheSchemas.sFlameWalletUnspent.safeParse(data);
    if (!unspent.success) return undefined;

    const amounts = Object.entries(unspent.data.amounts).map(
        ([id, amount]): [string, z.output<typeof sFlameOutputAmount>] => {
            if (amount.status !== 'counted') return [id, amount];

            const { memo: _memo, ...rest } = amount;
            return [id, rest];
        }
    );

    return { ...unspent.data, amounts: Object.fromEntries(amounts) };
}

// a sanitizer returns `undefined` for data it cannot clean, and the query is then not persisted
export const persistSanitizers: Partial<Record<CacheSchemaKey, (data: unknown) => unknown>> = {
    sFlameWalletUnspent: withoutFlameMemos
};

export function isValidSchemaKey(key: string): key is CacheSchemaKey {
    return key in cacheSchemas;
}
