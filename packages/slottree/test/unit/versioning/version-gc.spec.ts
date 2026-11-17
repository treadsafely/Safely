import { describe, expect, it, vi } from 'vitest';

import type { StorageV3 } from './version-fixtures';
import { v1, v3 } from './version-fixtures';
import type { Clock, StorageImpl } from '../../../src';
import {
    createStorage,
    createStorageFromSnapshot,
    DEVICES_KEY,
    VERSION_DELETION_GRACE_PERIOD_SECONDS,
    VERSION_DELETION_KEY,
    VersionController
} from '../../../src';
import { cborEncoder } from '../../../src/core/encoder/cbor/cbor-encoder';
import { MergeProtocol } from '../../../src/core/merge-protocol';
import { createOriginContainer } from '../../../src/core/slots';
import { slotFromJson, stripSlot } from '../../../src/core/slots/slot-json';
import { hListToRuntimeArray } from '../../../src/core/versioning/version';

const initialTime = 1_000;
const deletionDeadline = initialTime + VERSION_DELETION_GRACE_PERIOD_SECONDS;
const olderAuthor = Buffer.from('older-device');
const latestAuthor = Buffer.from('latest-device');
const staleAuthor = Buffer.from('stale-device').toString('hex');
const olderData = { key1: 42, key2: 'current' };
const latestData = { key1: 42, label: 'current', key3: true, key4: 'latest-only' };

describe('version garbage collection', () => {
    it('keeps an unused version until its deadline using the configured clock during merge', () => {
        let now = initialTime;
        const storage = createGcStorage({ nowSeconds: () => now });
        now = deletionDeadline - 1;

        const stats = storage.merge(storage.export());

        expect(stats.added).toBe(0);
        expect(stats.replaced).toBe(0);
        expect(stats.updated).toBe(0);
        expect(storage.exportSlot().v['2']).toBeDefined();
        expect(stripSlot(storage.exportSlot().v[VERSION_DELETION_KEY])).toEqual({
            '2': { shouldBeDeletedAt: deletionDeadline }
        });
    });

    it('physically deletes an unused intermediate version and preserves its marker on reopen', () => {
        let now = initialTime;
        const clock = { nowSeconds: () => now };
        const storage = createGcStorage(clock);
        const snapshot = storage.export();
        now = deletionDeadline;

        const cleaned = createStorageFromSnapshot({
            authorId: latestAuthor,
            versions: v3,
            snapshot,
            clock
        }) as StorageImpl<StorageV3>;

        expectCollected(cleaned);

        const reopened = createStorageFromSnapshot({
            authorId: latestAuthor,
            versions: v3,
            snapshot: cleaned.export(),
            clock
        }) as StorageImpl<StorageV3>;

        expectCollected(reopened);
        expect(reopened.get()).toEqual(latestData);
    });

    it('removes a stale intermediate version before it can propagate into used versions', () => {
        let now = initialTime;
        const clock = { nowSeconds: () => now };
        const storage = createGcStorage(clock);
        const stale = storage.export();
        now = deletionDeadline;
        storage.merge(storage.export());
        expectCollected(storage);

        storage.merge(stale);

        expectCollected(storage);
        expect(stripSlot(storage.exportSlot().v['1'])).toEqual(olderData);
        expect(storage.get()).toEqual(latestData);
    });

    it('recreates a deleted intermediate version from v1 and synchronizes further changes', () => {
        let now = initialTime;
        const clock = { nowSeconds: () => now };
        const latest = createGcStorage(clock);
        now = deletionDeadline;
        latest.merge(latest.export());
        expectCollected(latest);

        const older = createStorageFromSnapshot({
            authorId: olderAuthor,
            versions: v1,
            snapshot: latest.export(),
            clock
        });
        const upgraded = createStorageFromSnapshot({
            authorId: olderAuthor,
            versions: v3.tail,
            snapshot: older.export(),
            clock
        });

        expect(upgraded.get()).toEqual({ ...olderData, key3: false });
        expect(
            stripSlot(cborEncoder.decode(upgraded.export()).v[VERSION_DELETION_KEY])
        ).not.toHaveProperty('2');

        latest.merge(upgraded.export());
        upgraded.merge(latest.export());

        expect(upgraded.get()).toEqual({ ...olderData, key3: true });
        expect(stripSlot(latest.exportSlot().v[VERSION_DELETION_KEY])).not.toHaveProperty('2');

        upgraded.transaction(draft => {
            draft.set('key1', 100);
            draft.set('key2', 'from-v2');
        });
        latest.merge(upgraded.export());
        upgraded.merge(latest.export());

        expect(latest.get()).toEqual({ ...latestData, key1: 100, label: 'from-v2' });
        expect(upgraded.get()).toEqual({ key1: 100, key2: 'from-v2', key3: true });

        latest.transaction(draft => {
            draft.set('label', 'from-v3');
            draft.set('key3', false);
            draft.set('key4', 'retained');
        });
        upgraded.merge(latest.export());
        latest.merge(upgraded.export());

        expect(upgraded.get()).toEqual({ key1: 100, key2: 'from-v3', key3: false });
        expect(latest.get()).toEqual({
            key1: 100,
            label: 'from-v3',
            key3: false,
            key4: 'retained'
        });
        expect(stripSlot(latest.exportSlot().v[VERSION_DELETION_KEY])).toEqual({
            '1': { shouldBeDeletedAt: deletionDeadline + VERSION_DELETION_GRACE_PERIOD_SECONDS }
        });
    });

    it.each([true, false])(
        'clears an expired marker for a registered v2 device when its slot exists: %s',
        versionExists => {
            const clock = { nowSeconds: () => initialTime };
            const root = createGcStorage(clock).exportSlot();
            const versionSlot = root.v['2'];
            if (!versionExists) {
                delete root.v['2'];
            }
            const controller = new VersionController(
                root,
                hListToRuntimeArray(v3),
                new MergeProtocol('gc-device', clock),
                { nowSeconds: () => deletionDeadline }
            );
            controller.setDeviceVersion('v2-device', 2, deletionDeadline, 'v2-device');

            expect(controller.deleteVersionsUnusedByDevices()).toBe(true);

            expect(root.v['2']).toEqual(versionExists ? versionSlot : undefined);
            expect(stripSlot(root.v[VERSION_DELETION_KEY])).toEqual({});
            expect(controller.deleteVersionsUnusedByDevices()).toBe(false);
        }
    );

    it.each([false, true])(
        'clears the v2 deletion marker immediately when adding an author after physical GC: %s',
        collected => {
            let now = initialTime;
            const storage = createGcStorage({ nowSeconds: () => now });
            if (collected) {
                now = deletionDeadline;
                storage.merge(storage.export());
                expectCollected(storage);
            }
            const observer = vi.fn();
            storage.onChange(observer);

            storage.addAuthor(Buffer.from('v2-device'), 2);

            const root = storage.exportSlot();
            expect(stripSlot(root.v[VERSION_DELETION_KEY])).toEqual({});
            expect(root.v['2']).toBeDefined();
            expect(stripSlot(root.v[DEVICES_KEY])).toHaveProperty(
                [Buffer.from('v2-device').toString('hex'), 'version'],
                2
            );
            expect(observer).toHaveBeenCalledOnce();
            expect(storage.get()).toEqual(latestData);
            if (collected) {
                expect(stripSlot(root.v['2'])).toEqual({ ...olderData, key3: true });
            }
        }
    );

    it('uses the merged device registry to protect a version whose old marker has expired', () => {
        let now = initialTime;
        const clock = { nowSeconds: () => now };
        const latest = createGcStorage(clock);
        const upgraded = createStorageFromSnapshot({
            authorId: olderAuthor,
            versions: v3.tail,
            snapshot: latest.export(),
            clock
        });
        const incoming = cborEncoder.decode(upgraded.export());
        incoming.v[VERSION_DELETION_KEY] = latest.exportSlot().v[VERSION_DELETION_KEY];
        now = deletionDeadline;

        latest.mergeSlot(incoming);

        expect(latest.exportSlot().v['2']).toBeDefined();
        expect(stripSlot(latest.exportSlot().v[VERSION_DELETION_KEY])).not.toHaveProperty('2');
    });

    it('reports and publishes synchronous GC even when the raw merge has no changes', () => {
        let now = initialTime;
        const clock = { nowSeconds: () => now };
        const storage = createGcStorage(clock);
        const incoming = storage.export();
        const observer = vi.fn();
        storage.onChange(observer);
        now = deletionDeadline;

        const stats = storage.merge(incoming);

        expect(stats.added).toBe(0);
        expect(stats.replaced).toBe(0);
        expect(stats.updated).toBeGreaterThan(0);
        expect(observer).toHaveBeenCalledOnce();
        expectCollected(storage);
    });

    it('persists asynchronous GC even when the raw merge has no changes', async () => {
        let now = initialTime;
        const clock = { nowSeconds: () => now };
        const storage = createGcStorage(clock);
        const incoming = storage.export();
        const observer = vi.fn();
        storage.onChange(observer);
        now = deletionDeadline;
        const commit = vi.fn(async (snapshot: Buffer) => {
            const cleaned = cborEncoder.decode(snapshot);
            expect(cleaned.v).not.toHaveProperty('2');
            expect(stripSlot(cleaned.v[VERSION_DELETION_KEY])).toEqual({
                '2': { shouldBeDeletedAt: deletionDeadline }
            });
            expect(stripSlot(cleaned.v['1'])).toEqual(olderData);
            expect(stripSlot(cleaned.v['3'])).toEqual(latestData);
            expect(storage.exportSlot().v['2']).toBeDefined();
            return true;
        });

        expect(await storage.unsafeAsyncMerge(incoming, commit)).toBe(true);

        expect(commit).toHaveBeenCalledOnce();
        expect(observer).toHaveBeenCalledOnce();
        expectCollected(storage);
        expect(await storage.unsafeAsyncMerge(storage.export(), commit)).toBe(false);
        expect(commit).toHaveBeenCalledOnce();
    });
});

function createGcStorage(clock: Clock): StorageImpl<StorageV3> {
    return createStorage({
        authorId: latestAuthor,
        versions: v3,
        clock,
        root: createOriginContainer({
            '1': slotFromJson(olderData, 10, latestAuthor.toString('hex')),
            '2': slotFromJson({ key1: 999, key2: 'stale-v2', key3: false }, 20, staleAuthor),
            '3': slotFromJson(latestData, 10, latestAuthor.toString('hex')),
            [DEVICES_KEY]: slotFromJson(
                {
                    [olderAuthor.toString('hex')]: { version: 1 },
                    [latestAuthor.toString('hex')]: { version: 3 }
                },
                10,
                latestAuthor.toString('hex')
            )
        })
    }) as StorageImpl<StorageV3>;
}

function expectCollected(storage: StorageImpl<StorageV3>): void {
    const root = storage.exportSlot();
    expect(root.v).not.toHaveProperty('2');
    expect(stripSlot(root.v[VERSION_DELETION_KEY])).toEqual({
        '2': { shouldBeDeletedAt: deletionDeadline }
    });
}
