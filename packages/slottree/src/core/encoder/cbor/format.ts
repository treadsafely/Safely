import { z } from 'zod';

import type { JsonValue } from '../../json';
import { SlotKind } from '../../slots';

export type EncodedAuthor = string | Uint8Array;
export type EncodedKey = string | number;
export type BinaryPayload = [EncodedAuthor[], string[], SlotTuple];
export type SlotTuple =
    | [typeof SlotKind.Atomic, number, number, JsonValue]
    | [typeof SlotKind.Container, number, number, [EncodedKey, SlotTuple][]]
    | [typeof SlotKind.OrderedArray, number, number, [EncodedKey, SlotTuple][]]
    | [typeof SlotKind.Tombstone, number, number];

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(jsonValueSchema),
        z.record(z.string(), jsonValueSchema)
    ])
);

const encodedAuthorSchema: z.ZodType<EncodedAuthor> = z.union([
    z.string(),
    z.instanceof(Uint8Array)
]);

const encodedKeySchema: z.ZodType<EncodedKey> = z.union([
    z.string(),
    z.number().int().nonnegative()
]);

const authorIndexSchema = z.number().int().nonnegative();
const timestampSchema = z.int().nonnegative();

export const slotTupleSchema: z.ZodType<SlotTuple> = z.lazy(() =>
    z.union([
        z.tuple([z.literal(SlotKind.Atomic), authorIndexSchema, timestampSchema, jsonValueSchema]),
        z.tuple([z.literal(SlotKind.Tombstone), authorIndexSchema, timestampSchema]),
        z.tuple([
            z.literal(SlotKind.Container),
            authorIndexSchema,
            timestampSchema,
            z.array(z.tuple([encodedKeySchema, slotTupleSchema]))
        ]),
        z.tuple([
            z.literal(SlotKind.OrderedArray),
            authorIndexSchema,
            timestampSchema,
            z.array(z.tuple([encodedKeySchema, slotTupleSchema]))
        ])
    ])
);

export const binaryPayloadSchema: z.ZodType<BinaryPayload> = z.tuple([
    z.array(encodedAuthorSchema),
    z.array(z.string()),
    slotTupleSchema
]);
