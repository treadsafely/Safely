import { afterEach, describe, expect, it, vi } from 'vitest';

import { v1, v3 } from './version-fixtures';
import {
    DEVICES_KEY,
    VERSION_DELETION_GRACE_PERIOD_SECONDS,
    VERSION_DELETION_KEY,
    VersionController
} from '../../../src';
import { MergeProtocol } from '../../../src/core/merge-protocol';
import {
    createOriginContainer,
    isContainerSlot,
    type ContainerSlot
} from '../../../src/core/slots';
import { slotFromJson, stripSlot } from '../../../src/core/slots/slot-json';
import { hListToRuntimeArray } from '../../../src/core/versioning/version';
import { VersionPropagation } from '../../../src/core/versioning/version-propagation';

describe('VersionController', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('controls top-level version slots', () => {
        const versions = hListToRuntimeArray(v3);
        const root = createOriginContainer({
            '1': slotFromJson({ key1: 42, key2: 'from-v1' }, 123, 'old-device')
        });
        const controller = new VersionController(root, versions, fixedProtocol(200));

        expect(controller.get(1)).toBe(root.v['1']);

        const latest = controller.createVersionFrom(1);
        const v1Slot = root.v['1'] as ContainerSlot;

        expect(latest).toBe(root.v['3']);
        expect(root.v['2']).toBeUndefined();
        expect(latest?.v.key1).toEqual(v1Slot.v.key1);
        expect(latest?.v.label).toEqual(v1Slot.v.key2);
        expect(latest?.v.key3).toMatchObject({ v: false, t: 0, a: '' });
        expect(latest?.v.key4).toMatchObject({ v: 'v3', t: 0, a: '' });

        controller.delete(1);

        expect(controller.get(1)).toBeUndefined();
        expect(root.v).not.toHaveProperty('1');
    });

    it('creates the latest version from initial data', () => {
        const versions = hListToRuntimeArray(v3);
        const root = createOriginContainer();
        const controller = new VersionController(root, versions, fixedProtocol(200));

        const latest = controller.createInitialVersion();

        expect(latest).toBe(root.v['3']);
        expect(stripSlot(controller.get(3))).toEqual({
            key1: 0,
            label: 'initial',
            key3: false,
            key4: 'v3'
        });
    });

    it('keeps versions newer than the latest known version', () => {
        const versions = hListToRuntimeArray(v1);
        const root = createOriginContainer({
            '1': slotFromJson({ key1: 10, key2: 'known' }, 0, ''),
            '2': slotFromJson({ key1: 20, key2: 'newer-v2', key3: true }, 0, ''),
            '3': slotFromJson({ key1: 30, label: 'newer-v3', key3: true, key4: 'v3' }, 0, ''),
            [DEVICES_KEY]: slotFromJson(
                {
                    newerDevice: { version: 3 }
                },
                0,
                ''
            )
        });
        const controller = new VersionController(root, versions, fixedProtocol(200));

        controller.deleteVersionsUnusedByDevices();

        expect(root.v['1']).toBeDefined();
        expect(root.v['2']).toBeDefined();
        expect(root.v['3']).toBeDefined();
    });

    it('marks unused known versions for deletion instead of deleting them immediately', () => {
        const now = Math.floor(new Date('2026-01-01T00:00:00.000Z').getTime() / 1000);
        vi.setSystemTime(new Date(now * 1000));
        const versions = hListToRuntimeArray(v3);
        const root = createOriginContainer({
            '1': slotFromJson({ key1: 10, key2: 'legacy' }, 0, ''),
            '3': slotFromJson({ key1: 0, label: 'initial', key3: false, key4: 'v3' }, 0, ''),
            [DEVICES_KEY]: slotFromJson(
                {
                    latestDevice: { version: 3 }
                },
                0,
                ''
            )
        });
        const controller = new VersionController(root, versions, fixedProtocol(200));

        controller.deleteVersionsUnusedByDevices();

        expect(root.v['1']).toBeDefined();
        expect(root.v['3']).toBeDefined();
        expect(stripSlot(root.v[VERSION_DELETION_KEY])).toEqual({
            '1': {
                shouldBeDeletedAt: now + VERSION_DELETION_GRACE_PERIOD_SECONDS
            }
        });
    });

    it('deletes unused known versions after their deletion timestamp is reached', () => {
        const expiredAt = Math.floor(new Date('2026-04-01T00:00:00.000Z').getTime() / 1000);
        vi.setSystemTime(new Date('2026-04-02T00:00:00.000Z'));
        const versions = hListToRuntimeArray(v3);
        const root = createOriginContainer({
            '1': slotFromJson({ key1: 10, key2: 'legacy' }, 0, ''),
            '3': slotFromJson({ key1: 0, label: 'initial', key3: false, key4: 'v3' }, 0, ''),
            [VERSION_DELETION_KEY]: slotFromJson(
                {
                    '1': {
                        shouldBeDeletedAt: expiredAt
                    }
                },
                0,
                ''
            ),
            [DEVICES_KEY]: slotFromJson(
                {
                    latestDevice: { version: 3 }
                },
                0,
                ''
            )
        });
        const controller = new VersionController(root, versions, fixedProtocol(200));

        controller.deleteVersionsUnusedByDevices();

        expect(root.v).not.toHaveProperty('1');
        expect(root.v['3']).toBeDefined();
        expect(stripSlot(root.v[VERSION_DELETION_KEY])).toEqual({});
    });

    it('recreates a physically deleted older version when a device needs it', () => {
        const versions = hListToRuntimeArray(v3);
        const root = createOriginContainer({
            '1': slotFromJson({ key1: 0, key2: 'old-value' }, 0, ''),
            '3': slotFromJson(
                { key1: 42, label: 'latest-value', key3: true, key4: 'v3' },
                10,
                'latest-device'
            ),
            [DEVICES_KEY]: slotFromJson(
                {
                    legacyDevice: { version: 1 },
                    latestDevice: { version: 3 }
                },
                10,
                'latest-device'
            )
        });
        const protocol = new MergeProtocol('recreate-device');
        protocol.observeTree(root);
        new VersionController(root, versions, protocol).delete(1);

        expect(root.v).not.toHaveProperty('1');

        new VersionPropagation(versions, protocol).propagateToOlderVersions(root);

        const recreated = root.v['1'];
        expect(isContainerSlot(recreated)).toBe(true);
        if (!isContainerSlot(recreated)) {
            throw new Error('Expected v1 to be recreated as a container');
        }

        expect(recreated.t).toBe(10);
        expect(recreated.a).toBe('latest-device');
        expect(stripSlot(recreated)).toEqual({
            key1: 42,
            key2: 'latest-value'
        });
    });
});

function fixedProtocol(timestamp: number): { id: string; tick: () => number } {
    return {
        id: 'cleanup-device',
        tick: () => timestamp
    };
}
