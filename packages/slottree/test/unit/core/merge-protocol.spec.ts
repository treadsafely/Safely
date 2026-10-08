import { describe, expect, it } from 'vitest';

import { MergeProtocol } from '../../../src/core/merge-protocol';
import {
    createContainerSlot,
    createOriginContainer,
    createTombstoneSlot,
    SlotKind,
    type Slot
} from '../../../src/core/slots';

describe('MergeProtocol', () => {
    function atomicSlot(value: string, timestamp: number, author: string): Slot {
        return { s: SlotKind.Atomic, v: value, t: timestamp, a: author };
    }

    function mergeSlots(local: Slot, incoming: Slot) {
        return new MergeProtocol('local').merge(local, incoming);
    }

    it('replaces older atomic slots with newer atomic slots', () => {
        const local = atomicSlot('local', 1, 'local');
        const incoming = atomicSlot('incoming', 2, 'remote');

        const stats = mergeSlots(local, incoming);

        expect(local).toEqual({
            s: SlotKind.Atomic,
            v: 'incoming',
            t: 2,
            a: 'remote'
        });
        expect(stats).toEqual({ added: 0, updated: 0, kept: 0, replaced: 1 });
    });

    it('keeps newer atomic slots over older atomic slots', () => {
        const local = atomicSlot('local', 2, 'local');
        const incoming = atomicSlot('incoming', 1, 'remote');

        const stats = mergeSlots(local, incoming);

        expect(local).toEqual({
            s: SlotKind.Atomic,
            v: 'local',
            t: 2,
            a: 'local'
        });
        expect(stats).toEqual({ added: 0, updated: 0, kept: 1, replaced: 0 });
    });

    it('replaces between atomic slots and tombstones by clock order', () => {
        const localAtomic = atomicSlot('local', 1, 'local');
        const incomingTombstone = createTombstoneSlot(2, 'remote');

        mergeSlots(localAtomic, incomingTombstone);

        expect(localAtomic).toEqual({ s: SlotKind.Tombstone, t: 2, a: 'remote' });

        const localTombstone = createTombstoneSlot(2, 'local');
        const incomingAtomic = atomicSlot('incoming', 3, 'remote');

        mergeSlots(localTombstone, incomingAtomic);

        expect(localTombstone).toEqual({
            s: SlotKind.Atomic,
            v: 'incoming',
            t: 3,
            a: 'remote'
        });
    });

    it('replaces between container slots and tombstones by clock order', () => {
        const localContainer = createContainerSlot(1, 'local', {
            child: atomicSlot('local child', 1, 'local')
        });
        const incomingTombstone = createTombstoneSlot(2, 'remote');

        mergeSlots(localContainer, incomingTombstone);

        expect(localContainer).toEqual({
            s: SlotKind.Tombstone,
            t: 2,
            a: 'remote'
        });

        const localTombstone = createTombstoneSlot(2, 'local');
        const incomingContainer = createContainerSlot(3, 'remote', {
            child: atomicSlot('remote child', 3, 'remote')
        });

        mergeSlots(localTombstone, incomingContainer);

        expect(localTombstone).toEqual({
            s: SlotKind.Container,
            v: {
                child: {
                    s: SlotKind.Atomic,
                    v: 'remote child',
                    t: 3,
                    a: 'remote'
                }
            },
            t: 3,
            a: 'remote'
        });
    });

    it('recursively merges equal-clock containers', () => {
        const local = createContainerSlot(10, 'same-author', {
            localOnly: atomicSlot('local', 11, 'local'),
            nested: createContainerSlot(20, 'same-author', {
                localNested: atomicSlot('local nested', 21, 'local'),
                conflict: atomicSlot('older', 21, 'local')
            })
        });
        const incoming = createContainerSlot(10, 'same-author', {
            remoteOnly: atomicSlot('remote', 12, 'remote'),
            nested: createContainerSlot(20, 'same-author', {
                remoteNested: atomicSlot('remote nested', 22, 'remote'),
                conflict: atomicSlot('newer', 23, 'remote')
            })
        });

        const stats = mergeSlots(local, incoming);

        expect(local.v.localOnly).toEqual({
            s: SlotKind.Atomic,
            v: 'local',
            t: 11,
            a: 'local'
        });
        expect(local.v.remoteOnly).toEqual({
            s: SlotKind.Atomic,
            v: 'remote',
            t: 12,
            a: 'remote'
        });
        expect(local.v.nested).toMatchObject({
            s: SlotKind.Container,
            t: 20,
            a: 'same-author',
            v: {
                localNested: {
                    s: SlotKind.Atomic,
                    v: 'local nested',
                    t: 21,
                    a: 'local'
                },
                remoteNested: {
                    s: SlotKind.Atomic,
                    v: 'remote nested',
                    t: 22,
                    a: 'remote'
                },
                conflict: { s: SlotKind.Atomic, v: 'newer', t: 23, a: 'remote' }
            }
        });
        expect(stats).toEqual({ added: 2, updated: 0, kept: 2, replaced: 1 });
    });

    it('replaces the whole subtree when container clocks differ', () => {
        const local = createContainerSlot(10, 'local', {
            localOnly: atomicSlot('local', 11, 'local'),
            shared: atomicSlot('local shared', 11, 'local')
        });
        const incoming = createContainerSlot(12, 'remote', {
            shared: atomicSlot('remote shared', 12, 'remote'),
            remoteOnly: atomicSlot('remote', 12, 'remote')
        });

        const stats = mergeSlots(local, incoming);

        expect(local).toEqual({
            s: SlotKind.Container,
            v: {
                shared: {
                    s: SlotKind.Atomic,
                    v: 'remote shared',
                    t: 12,
                    a: 'remote'
                },
                remoteOnly: { s: SlotKind.Atomic, v: 'remote', t: 12, a: 'remote' }
            },
            t: 12,
            a: 'remote'
        });
        expect('localOnly' in local.v).toBe(false);
        expect(stats).toEqual({ added: 0, updated: 0, kept: 0, replaced: 1 });
    });

    it('replaces the whole subtree when container timestamps tie but author ids differ', () => {
        const local = createContainerSlot(10, 'author-a', {
            localOnly: atomicSlot('local', 11, 'author-a'),
            shared: atomicSlot('local shared', 11, 'author-a')
        });
        const incoming = createContainerSlot(10, 'author-b', {
            shared: atomicSlot('remote shared', 10, 'author-b'),
            remoteOnly: atomicSlot('remote', 10, 'author-b')
        });

        const stats = mergeSlots(local, incoming);

        expect(local).toEqual({
            s: SlotKind.Container,
            v: {
                shared: {
                    s: SlotKind.Atomic,
                    v: 'remote shared',
                    t: 10,
                    a: 'author-b'
                },
                remoteOnly: { s: SlotKind.Atomic, v: 'remote', t: 10, a: 'author-b' }
            },
            t: 10,
            a: 'author-b'
        });
        expect('localOnly' in local.v).toBe(false);
        expect(stats).toEqual({ added: 0, updated: 0, kept: 0, replaced: 1 });
    });

    it('uses author id to resolve equal timestamps', () => {
        const local = atomicSlot('from-a', 10, 'author-a');
        const incoming = atomicSlot('from-b', 10, 'author-b');

        mergeSlots(local, incoming);

        expect(local).toEqual({
            s: SlotKind.Atomic,
            v: 'from-b',
            t: 10,
            a: 'author-b'
        });

        const winner = atomicSlot('from-b', 10, 'author-b');
        const loser = atomicSlot('from-a', 10, 'author-a');

        const stats = mergeSlots(winner, loser);

        expect(winner).toEqual({
            s: SlotKind.Atomic,
            v: 'from-b',
            t: 10,
            a: 'author-b'
        });
        expect(stats).toEqual({ added: 0, updated: 0, kept: 1, replaced: 0 });
    });

    it.each([Number.MAX_VALUE, -1, 1.5])('rejects invalid observed timestamp %s', timestamp => {
        const protocol = new MergeProtocol('local');

        expect(() => protocol.observe(timestamp)).toThrow(
            'Slot timestamp must be a non-negative safe integer'
        );
    });

    it('fails instead of reusing a timestamp when the logical clock is exhausted', () => {
        const protocol = new MergeProtocol('local');
        protocol.observe(Number.MAX_SAFE_INTEGER);

        expect(() => protocol.tick()).toThrow('Logical clock exhausted');
    });

    it('observes every incoming timestamp before merge decisions hide losing subtrees', () => {
        const protocol = new MergeProtocol('local');
        const hiddenIncomingTimestamp = Math.floor(Date.now() / 1000) + 100_000;

        const local = createOriginContainer({
            record: createTombstoneSlot(hiddenIncomingTimestamp - 1, 'local')
        });

        const incoming = createOriginContainer({
            record: createContainerSlot(1, 'remote', {
                child: {
                    s: SlotKind.Atomic,
                    v: 'hidden but observed',
                    t: hiddenIncomingTimestamp,
                    a: 'remote'
                }
            })
        });

        protocol.merge(local, incoming);

        expect(local.v.record).toMatchObject({
            s: SlotKind.Tombstone,
            t: hiddenIncomingTimestamp - 1,
            a: 'local'
        });
        expect(protocol.tick()).toBeGreaterThan(hiddenIncomingTimestamp);
    });
});
