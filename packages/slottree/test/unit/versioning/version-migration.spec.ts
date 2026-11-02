import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { StorageV1 } from './version-fixtures';
import { identityPatch, type StorageV3, v1, v3 } from './version-fixtures';
import type { StorageImpl } from '../../../src';
import {
    createStorage,
    createStorageFromSnapshot,
    DEVICES_KEY,
    VERSION_DELETION_KEY
} from '../../../src';
import { cborEncoder } from '../../../src/core/encoder/cbor/cbor-encoder';
import {
    createOriginContainer,
    createTombstoneSlot,
    SlotKind,
    type ContainerSlot
} from '../../../src/core/slots';
import { slotFromJson, stripSlot } from '../../../src/core/slots/slot-json';
import { patch } from '../../../src/core/versioning/patch';
import { defineVersionHList, hCons, hNil } from '../../../src/core/versioning/version';

const device1 = Buffer.from('device-1').toString('hex');
const deviceV1 = Buffer.from('device-v1').toString('hex');
const deviceV2 = Buffer.from('device-v2').toString('hex');
const oldDeviceAuthor = Buffer.from('old-device').toString('hex');

describe('version migration', () => {
    it('initializes the latest version by migrating an existing older version', () => {
        const root = createOriginContainer({
            '1': slotFromJson({ key1: 42, key2: 'from-v1' }, 123, 'old-device')
        });

        const storage = createStorage({
            authorId: Buffer.from('device-1'),
            versions: v3,
            root
        }) as StorageImpl<StorageV3>;

        expect(storage.get()).toEqual({
            key1: 42,
            label: 'from-v1',
            key3: false,
            key4: 'v3'
        });

        const exported = storage.exportSlot();
        const v3Slot = exported.v['3'] as ContainerSlot;

        expect(exported.v['1']).toBeDefined();
        expect(exported.v['2']).toBeUndefined();
        expect(stripSlot(exported.v[VERSION_DELETION_KEY])).toEqual({
            '1': {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                shouldBeDeletedAt: expect.any(Number)
            }
        });
        expect(v3Slot.v.key1).toMatchObject({
            v: 42,
            t: 123,
            a: 'old-device'
        });
        expect(v3Slot.v.label).toMatchObject({
            v: 'from-v1',
            t: 123,
            a: 'old-device'
        });
        expect(v3Slot.v.key3).toMatchObject({ v: false, t: 0, a: '' });
        expect(v3Slot.v.key4).toMatchObject({ v: 'v3', t: 0, a: '' });
    });

    it('restores a tombstoned latest version from the previous live version', () => {
        const tombstoneTimestamp = 9_999_999_999;
        const cleanupAuthor = Buffer.from('cleanup-device').toString('hex');
        const root = createOriginContainer({
            '1': slotFromJson({ key1: 42, key2: 'from-v1' }, 123, oldDeviceAuthor),
            '2': createTombstoneSlot(tombstoneTimestamp - 1, cleanupAuthor),
            '3': createTombstoneSlot(tombstoneTimestamp, cleanupAuthor)
        });
        const snapshot = cborEncoder.encode(root);
        const options = {
            authorId: Buffer.from('device-1'),
            versions: v3,
            clock: { nowSeconds: () => 1_000 }
        };
        const storage = createStorageFromSnapshot({ ...options, snapshot });
        const expected = {
            key1: 42,
            label: 'from-v1',
            key3: false,
            key4: 'v3'
        };

        expect(storage.get()).toEqual(expected);

        const restored = cborEncoder.decode(storage.export()).v['3'] as ContainerSlot;

        expect(restored.s).toBe(SlotKind.Container);
        expect(restored.t).toBe(123);
        expect(restored.a).toBe(oldDeviceAuthor);
        expect(restored.v.key1).toMatchObject({ v: 42, t: 123, a: oldDeviceAuthor });
        expect(restored.v.label).toMatchObject({ v: 'from-v1', t: 123, a: oldDeviceAuthor });

        const reopened = createStorageFromSnapshot({
            ...options,
            snapshot: storage.export()
        });

        expect(reopened.get()).toEqual(expected);
    });

    it('physically deletes an unused intermediate version without recreating it during projections', () => {
        const root = createOriginContainer({
            '1': slotFromJson({ key1: 42, key2: 'from-v1' }, 0, ''),
            '2': slotFromJson({ key1: 42, key2: 'from-v1', key3: false }, 0, ''),
            '3': slotFromJson({ key1: 42, label: 'from-v1', key3: false, key4: 'v3' }, 0, ''),
            [DEVICES_KEY]: slotFromJson(
                {
                    [device1]: { version: 3 },
                    [oldDeviceAuthor]: { version: 1 }
                },
                0,
                ''
            ),
            [VERSION_DELETION_KEY]: slotFromJson({ '2': { shouldBeDeletedAt: 2_000 } }, 0, '')
        });
        const clock = { nowSeconds: () => 3_000 };
        const latest = createStorageFromSnapshot({
            authorId: Buffer.from('device-1'),
            versions: v3,
            snapshot: cborEncoder.encode(root),
            clock
        });

        expect(cborEncoder.decode(latest.export()).v).not.toHaveProperty('2');

        latest.transaction(draft => {
            draft.set('label', 'from-v3');
        });

        expect(cborEncoder.decode(latest.export()).v).not.toHaveProperty('2');

        const older = createStorageFromSnapshot({
            authorId: Buffer.from('old-device'),
            versions: v1,
            snapshot: latest.export(),
            clock
        });

        older.transaction(draft => {
            draft.set('key1', 84);
        });
        latest.merge(older.export());

        expect(latest.get().key1).toBe(84);
        expect(cborEncoder.decode(latest.export()).v).not.toHaveProperty('2');

        older.merge(latest.export());

        expect(older.get()).toEqual({ key1: 84, key2: 'from-v3' });

        const reopened = createStorageFromSnapshot({
            authorId: Buffer.from('device-1'),
            versions: v3,
            snapshot: latest.export(),
            clock
        });

        expect(reopened.get()).toEqual(latest.get());
        expect(cborEncoder.decode(reopened.export()).v).not.toHaveProperty('2');

        reopened.addAuthor(Buffer.from('device-v2'), 2);

        expect(stripSlot(cborEncoder.decode(reopened.export()).v['2'])).toEqual({
            key1: 84,
            key2: 'from-v3',
            key3: false
        });
    });

    it('propagates latest updates to existing older versions', () => {
        const root = createOriginContainer({
            '1': slotFromJson({ key1: 0, key2: 'initial' }, 0, ''),
            '2': slotFromJson({ key1: 0, key2: 'initial', key3: false }, 0, ''),
            '3': slotFromJson({ key1: 0, label: 'initial', key3: false, key4: 'v3' }, 0, ''),
            [DEVICES_KEY]: slotFromJson(
                {
                    [device1]: { version: 3 },
                    [deviceV1]: { version: 1 },
                    [deviceV2]: { version: 2 }
                },
                0,
                ''
            )
        });

        const storage = createStorage({
            authorId: Buffer.from('device-1'),
            versions: v3,
            root
        }) as StorageImpl<StorageV3>;

        storage.transaction(draft => {
            draft.set('key1', 10);
            draft.set('label', 'updated');
            draft.set('key4', 'latest-only');
        });

        const exported = storage.exportSlot();
        expect(exported.v['2']).toMatchObject({
            v: {
                key1: { v: 10 },
                key2: { v: 'updated', a: device1 },
                key3: { v: false, t: 0 }
            }
        });
        expect(exported.v['1']).toMatchObject({
            v: {
                key1: { v: 10 },
                key2: { v: 'updated', a: device1 }
            }
        });

        const v3Slot = exported.v['3'] as ContainerSlot;
        const v2Slot = exported.v['2'] as ContainerSlot;
        const v1Slot = exported.v['1'] as ContainerSlot;
        expect(v2Slot.v.key2).toMatchObject({
            t: v3Slot.v.label?.t,
            a: v3Slot.v.label?.a
        });
        expect(v1Slot.v.key2).toMatchObject({
            t: v3Slot.v.label?.t,
            a: v3Slot.v.label?.a
        });
    });

    it('propagates through missing older versions without creating them', () => {
        const root = createOriginContainer({
            '1': slotFromJson({ key1: 0, key2: 'initial' }, 0, ''),
            '3': slotFromJson({ key1: 0, label: 'initial', key3: false, key4: 'v3' }, 0, ''),
            [DEVICES_KEY]: slotFromJson(
                {
                    [device1]: { version: 3 },
                    [deviceV1]: { version: 1 }
                },
                0,
                ''
            )
        });

        const storage = createStorage({
            authorId: Buffer.from('device-1'),
            versions: v3,
            root
        }) as StorageImpl<StorageV3>;

        storage.transaction(draft => {
            draft.set('label', 'updated');
        });

        const exported = storage.exportSlot();
        expect(exported.v['2']).toBeUndefined();
        expect(exported.v['1']).toMatchObject({
            v: {
                key1: { v: 0, t: 0 },
                key2: { v: 'updated' }
            }
        });
    });

    it('migrates older-version edits up after merge', () => {
        const oldDevice = createStorage({
            authorId: Buffer.from('old-device'),
            versions: v1
        }) as StorageImpl<StorageV1>;
        const newDevice = createStorage({
            authorId: Buffer.from('new-device'),
            versions: v3
        }) as StorageImpl<StorageV3>;

        oldDevice.transaction(draft => {
            draft.set('key1', 42);
            draft.set('key2', 'from-v1');
        });

        newDevice.merge(oldDevice.export());

        const oldExport = oldDevice.exportSlot();
        const newExport = newDevice.exportSlot();
        const oldV1 = oldExport.v['1'] as ContainerSlot;
        const newV3 = newExport.v['3'] as ContainerSlot;

        expect(newDevice.get()).toEqual({
            key1: 42,
            label: 'from-v1',
            key3: false,
            key4: 'v3'
        });
        expect(newV3.v.label).toMatchObject({
            t: oldV1.v.key2?.t,
            a: oldV1.v.key2?.a
        });
        expect(newV3.v.key4).toMatchObject({ t: 0, a: '' });
    });

    it('migrates older-version slots up after merge when device metadata stays latest', () => {
        const sharedDevice = Buffer.from('shared-device');
        const sharedDeviceHex = sharedDevice.toString('hex');
        const receivingRoot = createOriginContainer({
            '3': slotFromJson(
                {
                    key1: 0,
                    label: 'initial',
                    key3: false,
                    key4: 'v3'
                },
                0,
                ''
            ),
            [DEVICES_KEY]: slotFromJson(
                {
                    [sharedDeviceHex]: { version: 3 }
                },
                100,
                sharedDeviceHex
            )
        });
        const incomingRoot = createOriginContainer({
            '1': slotFromJson({ key1: 42, key2: 'from-v1' }, 50, sharedDeviceHex),
            [DEVICES_KEY]: slotFromJson(
                {
                    [sharedDeviceHex]: { version: 1 }
                },
                50,
                sharedDeviceHex
            )
        });
        const receivingDevice = createStorage({
            authorId: sharedDevice,
            versions: v3,
            root: receivingRoot
        }) as StorageImpl<StorageV3>;
        const incomingStorage = createStorage({
            authorId: Buffer.from('reader'),
            versions: v1,
            root: incomingRoot
        }) as StorageImpl<StorageV1>;

        receivingDevice.merge(incomingStorage.export());

        expect(receivingDevice.get()).toEqual({
            key1: 42,
            label: 'from-v1',
            key3: false,
            key4: 'v3'
        });
    });

    it('preserves tombstones through raw slot patches', () => {
        const schemaOptionalV1 = z.object({
            keep: z.string(),
            optional: z.string().optional()
        });
        const schemaOptionalV2 = z.object({
            keep: z.string(),
            renamed: z.string().optional(),
            added: z.boolean()
        });

        const projectOptionalV1ToV2 = patch(schemaOptionalV1, schemaOptionalV2, draft =>
            draft.rename([], 'optional', 'renamed').newField([], 'added', false)
        );

        const projectOptionalV2ToV1 = patch(schemaOptionalV2, schemaOptionalV1, draft =>
            draft.rename([], 'renamed', 'optional').deleteField([], 'added')
        );

        const optionalV2 = defineVersionHList(
            hCons(
                {
                    version: 2,
                    schema: schemaOptionalV2,
                    initial: {
                        keep: '',
                        renamed: 'initial',
                        added: false
                    },
                    projectUp: projectOptionalV1ToV2,
                    projectDown: projectOptionalV2ToV1
                },
                hCons(
                    {
                        version: 1,
                        schema: schemaOptionalV1,
                        initial: {
                            keep: '',
                            optional: 'initial'
                        },
                        projectUp: identityPatch,
                        projectDown: identityPatch
                    },
                    hNil
                )
            )
        );
        const optionalV1 = defineVersionHList(
            hCons(
                {
                    version: 1,
                    schema: schemaOptionalV1,
                    initial: {
                        keep: '',
                        optional: 'initial'
                    },
                    projectUp: identityPatch,
                    projectDown: identityPatch
                },
                hNil
            )
        );

        const oldDevice = createStorage({
            authorId: Buffer.from('old-device'),
            versions: optionalV1
        }) as StorageImpl<z.output<typeof schemaOptionalV1>>;
        const newDevice = createStorage({
            authorId: Buffer.from('new-device'),
            versions: optionalV2
        }) as StorageImpl<z.output<typeof schemaOptionalV2>>;

        oldDevice.transaction(draft => {
            draft.delete('optional');
        });

        newDevice.merge(oldDevice.export());

        const oldExport = oldDevice.exportSlot();
        const newExport = newDevice.exportSlot();
        const oldTombstone = (oldExport.v['1'] as ContainerSlot).v.optional;
        const migratedTombstone = (newExport.v['2'] as ContainerSlot).v.renamed;

        expect(migratedTombstone).toEqual(oldTombstone);
        expect(migratedTombstone).toMatchObject({
            s: SlotKind.Tombstone,
            a: oldDeviceAuthor
        });
    });
});
