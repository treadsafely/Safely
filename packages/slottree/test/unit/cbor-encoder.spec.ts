import * as cbor from 'cbor-x';
import { describe, expect, it } from 'vitest';

import type { JsonValue } from '../../src';
import { cborEncoder } from '../../src/core/encoder/cbor/cbor-encoder';
import {
    createContainerSlot,
    createOriginContainer,
    createOrderedArraySlot,
    createTombstoneSlot,
    ORDERED_ARRAY_ITEM_ID_KEY,
    SlotKind,
    type ContainerSlot,
    type Slot
} from '../../src/core/slots';

describe('CborEncoder', () => {
    const hexAuthor = 'a'.repeat(64);
    const stringAuthor = Buffer.from('device-string-author').toString('hex');

    function atomic(value: JsonValue, timestamp: number, author = stringAuthor): Slot {
        return {
            s: SlotKind.Atomic,
            v: value,
            t: timestamp,
            a: author
        };
    }

    it('roundtrips all slot kinds and JSON atomic values', () => {
        const root = createOriginContainer({
            stringValue: atomic('text', 2),
            numberValue: atomic(42, 3),
            booleanValue: atomic(true, 4),
            nullValue: atomic(null, 5),
            arrayValue: atomic(['nested', 1, false, null], 6),
            objectValue: atomic({ deep: { value: 'json' } }, 7),
            tombstoneValue: createTombstoneSlot(8, hexAuthor),
            nestedContainer: createContainerSlot(9, hexAuthor, {
                child: atomic('inside', 10, hexAuthor)
            }),
            orderedItems: createOrderedArraySlot(11, stringAuthor, {
                first: createContainerSlot(12, hexAuthor, {
                    order: atomic(1, 13, hexAuthor),
                    value: createContainerSlot(14, stringAuthor, {
                        [ORDERED_ARRAY_ITEM_ID_KEY]: atomic('first', 15, stringAuthor),
                        name: atomic('First item', 16, stringAuthor)
                    })
                }),
                deleted: createTombstoneSlot(17, stringAuthor)
            }),
            customKey: atomic('not in dictionary', 18)
        });

        expect(roundtrip(root)).toEqual(root);
    });

    it.each([Number.MAX_VALUE, -1, 1.5])('rejects invalid timestamp %s', timestamp => {
        const root = createOriginContainer({
            value: atomic('invalid timestamp', timestamp)
        });

        expect(() => roundtrip(root)).toThrow();
    });

    it('roundtrips the greatest safe timestamp', () => {
        const root = createOriginContainer({
            value: atomic('safe timestamp', Number.MAX_SAFE_INTEGER)
        });

        expect(roundtrip(root)).toEqual(root);
    });

    it('roundtrips ordered array item __setId as a regular slot', () => {
        const root = createOriginContainer({
            orderedItems: createOrderedArraySlot(2, stringAuthor, {
                itemA: createContainerSlot(3, stringAuthor, {
                    order: atomic(1, 4),
                    value: createContainerSlot(5, stringAuthor, {
                        [ORDERED_ARRAY_ITEM_ID_KEY]: atomic('itemA', 6),
                        name: atomic('Restored item', 7)
                    })
                })
            })
        });

        const decoded = roundtrip(root);
        const setIdSlot = (
            ((decoded.v.orderedItems as ContainerSlot).v.itemA as ContainerSlot).v
                .value as ContainerSlot
        ).v[ORDERED_ARRAY_ITEM_ID_KEY] as Slot;

        expect(setIdSlot.t).toBe(6);
        expect(decoded).toEqual(root);
    });

    it('stores repeated long keys in the payload key table', () => {
        const root = createOriginContainer({
            left: createContainerSlot(2, stringAuthor, {
                a: atomic('left-short', 9),
                id: atomic('left-id', 3),
                name: atomic('left-name', 4),
                singleKey: atomic('single', 5)
            }),
            right: createContainerSlot(6, stringAuthor, {
                a: atomic('right-short', 10),
                id: atomic('right-id', 7),
                name: atomic('right-name', 8)
            })
        });

        const payload = cbor.decode(cborEncoder.encodeBinary(root)) as unknown[];

        expect(payload[1]).toContain('name');
        expect(payload[1]).not.toContain('id');
        expect(payload[1]).not.toContain('a');
        expect(payload[1]).not.toContain('singleKey');
        expect(roundtrip(root)).toEqual(root);
    });

    it('rejects a decoded root with a non-origin timestamp', () => {
        const root = createContainerSlot(1, stringAuthor, {
            value: atomic('invalid root stamp', 2)
        });

        expect(() => roundtrip(root)).toThrow('Slot tree root must be an origin container slot');
    });

    it('rejects a decoded root with a non-empty author', () => {
        const root = createContainerSlot(0, stringAuthor, {
            value: atomic('invalid root author', 2)
        });

        expect(() => roundtrip(root)).toThrow('Slot tree root must be an origin container slot');
    });

    function roundtrip(root: ContainerSlot): ContainerSlot {
        return cborEncoder.decodeBinary(cborEncoder.encodeBinary(root));
    }
});
