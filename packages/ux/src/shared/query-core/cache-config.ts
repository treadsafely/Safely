import { z } from 'zod';

import { aboutSchema, bootConfigSchema, sCryptoAssetAmount, sCryptoFiatRate } from '@safely/core';
import { UtxoSchema, UtxoWithOptionalTxSchema } from '@safely/core/api/btc';
import { providersSchema, rampOrderSchema } from '@safely/core/api/exchange';
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
    bootConfig: bootConfigSchema,
    about: aboutSchema,
    exchangeProviders: providersSchema,
    infiniteActivityData: sInfiniteActivityData,
    sHistoricalPrice: HistoricalPriceSchema,
    sCryptoFiatRate: sCryptoFiatRate
} satisfies Record<string, z.ZodType>;

export type CacheSchemaKey = keyof typeof cacheSchemas;

export function isValidSchemaKey(key: string): key is CacheSchemaKey {
    return key in cacheSchemas;
}
