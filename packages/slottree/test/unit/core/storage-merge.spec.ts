import { beforeEach, describe, expect, it } from 'vitest';
import type { z } from 'zod';

import type { StorageImpl } from '../../../src';
import { createStorage } from '../../../src';
import {
    createContainerSlot,
    createOrderedArraySlot,
    createOriginContainer,
    SlotKind
} from '../../../src/core/slots';
import { slotFromJson } from '../../../src/core/slots/slot-json';
import type { schemaV1 } from '../versioning/version-fixtures';
import { v1 } from '../versioning/version-fixtures';

describe('storage merge', () => {
    let storage1: StorageImpl<z.output<typeof schemaV1>>;
    let storage2: StorageImpl<z.output<typeof schemaV1>>;

    beforeEach(() => {
        storage1 = createStorage({
            authorId: Buffer.from('device-1'),
            versions: v1
        }) as StorageImpl<z.output<typeof schemaV1>>;
        storage2 = createStorage({
            authorId: Buffer.from('device-2'),
            versions: v1
        }) as StorageImpl<z.output<typeof schemaV1>>;
    });

    it('merges values', () => {
        storage1.transaction(draft => {
            draft.set('key1', 10);
        });
        storage2.transaction(draft => {
            draft.set('key2', 'value2');
        });

        storage1.merge(storage2.export());
        expect(storage1.get().key1).toEqual(10);
        expect(storage1.get().key2).toEqual('value2');

        storage2.merge(storage1.export());
        expect(storage2.get().key1).toEqual(10);
        expect(storage2.get().key2).toEqual('value2');
    });

    it.each([Number.MAX_VALUE, -1, 1.5])(
        'rejects a snapshot containing invalid timestamp %s',
        timestamp => {
            const incoming = createOriginContainer({
                '1': createOriginContainer({
                    key1: {
                        s: SlotKind.Atomic,
                        v: 42,
                        t: timestamp,
                        a: 'remote'
                    }
                })
            });

            expect(() => storage1.mergeSlot(incoming)).toThrow(
                'Slot timestamp must be a non-negative safe integer'
            );
            expect(storage1.get()).toEqual({ key1: 0, key2: 'initial' });
        }
    );

    it('notifies observers after successful merges that change storage', () => {
        let calls = 0;
        storage1.onChange(() => {
            calls += 1;
        });

        storage2.transaction(draft => {
            draft.set('key2', 'value2');
        });

        storage1.merge(storage2.export());

        expect(calls).toBe(1);
    });

    it('does not notify observers after no-op merges', () => {
        let calls = 0;
        storage1.onChange(() => {
            calls += 1;
        });

        storage1.merge(storage1.export());

        expect(calls).toBe(0);
    });

    it('leaves storage unchanged when an incoming merge fails validation', () => {
        const incoming = createOriginContainer({
            '1': slotFromJson({ key1: 'invalid', key2: 'value2' }, 2_000_000_000, 'remote')
        });

        expect(() => storage1.mergeSlot(incoming)).toThrow();
        expect(storage1.get()).toEqual({ key1: 0, key2: 'initial' });

        storage1.transaction(draft => {
            draft.set('key1', 1);
        });
        const exported = storage1.exportSlot();
        const versionSlot = exported.v['1'] as unknown as {
            v: { key1: { t: number } };
        };
        expect(versionSlot.v.key1.t).toBeLessThan(2_000_000_000);
    });

    it('does not notify observers when merge fails', () => {
        const incoming = createOriginContainer({
            '1': slotFromJson({ key1: 'invalid', key2: 'value2' }, 2_000_000_000, 'remote')
        });
        let calls = 0;
        storage1.onChange(() => {
            calls += 1;
        });

        expect(() => storage1.mergeSlot(incoming)).toThrow();

        expect(calls).toBe(0);
    });

    it('rejects storage initialized with a non-origin root', () => {
        const root = createContainerSlot(1, 'remote', {
            '1': slotFromJson({ key1: 1, key2: 'value2' }, 2_000_000_000, 'remote')
        });

        expect(() =>
            createStorage({
                authorId: Buffer.from('device-1'),
                versions: v1,
                root
            })
        ).toThrow('Slot tree root must be an origin container slot');
    });

    it('rejects raw merges whose root is not an origin container', () => {
        const incoming = createContainerSlot(0, 'remote', {
            '1': slotFromJson({ key1: 1, key2: 'value2' }, 2_000_000_000, 'remote')
        });

        expect(() => storage1.mergeSlot(incoming)).toThrow(
            'Slot tree root must be an origin container slot'
        );
        expect(storage1.get()).toEqual({ key1: 0, key2: 'initial' });
    });

    it.each([1.5, 2 ** 31])('rejects incoming ordered array item order %s', invalidOrder => {
        const incoming = createOriginContainer({
            '1': createContainerSlot(2_000_000_000, 'remote', {
                portfolios: createOrderedArraySlot(2_000_000_000, 'remote', {
                    item: createContainerSlot(2_000_000_000, 'remote', {
                        order: {
                            s: SlotKind.Atomic,
                            v: invalidOrder,
                            t: 2_000_000_000,
                            a: 'remote'
                        },
                        value: slotFromJson(
                            { __setId: 'item', name: 'Invalid' },
                            2_000_000_000,
                            'remote'
                        )
                    })
                })
            })
        });

        expect(() => storage1.mergeSlot(incoming)).toThrow(
            'Ordered array item "item" order must be a 32-bit integer atomic slot'
        );
        expect(storage1.get()).toEqual({ key1: 0, key2: 'initial' });
    });
});
