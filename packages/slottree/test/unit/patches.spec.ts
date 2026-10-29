import { describe, expect, it } from 'vitest';

import type { JsonValue } from '../../src/core/json';
import {
    createTombstoneSlot,
    isContainerSlot,
    isOrderedArraySlot,
    type ContainerSlot,
    type Slot
} from '../../src/core/slots';
import { slotFromJson, stripSlot } from '../../src/core/slots/slot-json';
import { PatchCursor } from '../../src/core/versioning/patch/cursor';
import { createPatchDraft } from '../../src/core/versioning/patch/draft';

type RuntimeMatcher = JsonValue | ((value: unknown) => boolean);

type RuntimeDraft = {
    newField(field: string, value: JsonValue): RuntimeDraft;
    newField(path: readonly string[], field: string, value: JsonValue): RuntimeDraft;
    rename(from: string, to: string): RuntimeDraft;
    rename(path: readonly string[], from: string, to: string): RuntimeDraft;
    update(map: (value: unknown) => JsonValue | undefined): RuntimeDraft;
    update(path: readonly string[], map: (value: unknown) => JsonValue | undefined): RuntimeDraft;
    deleteField(field: string): RuntimeDraft;
    deleteField(path: readonly string[], field: string): RuntimeDraft;
    move(from: readonly string[], to: readonly string[]): RuntimeDraft;
    updateEach(map: (draft: RuntimeDraft) => unknown): RuntimeDraft;
    updateEach(path: readonly string[], map: (draft: RuntimeDraft) => unknown): RuntimeDraft;
    deleteEach(match: (value: unknown) => boolean): RuntimeDraft;
    deleteEach(path: readonly string[], match: (value: unknown) => boolean): RuntimeDraft;
    when(value: RuntimeMatcher, map: (draft: RuntimeDraft) => unknown): RuntimeDraft;
    when(
        path: readonly string[],
        value: RuntimeMatcher,
        map: (draft: RuntimeDraft) => unknown
    ): RuntimeDraft;
};

describe('PatchDraft runtime', () => {
    describe('newField', () => {
        it('creates a new field with origin timestamp and author', () => {
            const slot = sourceSlot({ name: 'Alice' });
            const draft = draftOf(slot);

            draft.newField([], 'createdAt', 0);

            expect(stripSlot(slot)).toEqual({
                name: 'Alice',
                createdAt: 0
            });
            expect(slot.v.name).toMatchObject(clock());
            expect(slot.v.createdAt).toMatchObject(originClock());
        });

        it('creates nested values with origin metadata for the whole created subtree', () => {
            const slot = sourceSlot({ settings: { layout: 'compact' } });
            const draft = draftOf(slot);

            draft.newField(['settings'], 'theme', { name: 'light' });

            const settings = expectContainer(slot.v.settings, 'settings');
            const theme = expectContainer(settings.v.theme, 'theme');

            expect(stripSlot(slot)).toEqual({
                settings: {
                    layout: 'compact',
                    theme: {
                        name: 'light'
                    }
                }
            });
            expect(settings.v.layout).toMatchObject(clock());
            expect(theme).toMatchObject(originClock());
            expect(theme.v.name).toMatchObject(originClock());
        });

        it('uses the root path when path is omitted', () => {
            const slot = sourceSlot({ name: 'Alice' });
            const draft = draftOf(slot);

            draft.newField('createdAt', 0);

            expect(stripSlot(slot)).toEqual({
                name: 'Alice',
                createdAt: 0
            });
            expect(slot.v.createdAt).toMatchObject(originClock());
        });

        it('throws when target field already exists', () => {
            const draft = draftOf(sourceSlot({ name: 'Alice' }));

            expect(() => draft.newField([], 'name', 'Bob')).toThrow(
                'Cannot create field "name" because it already exists'
            );
        });
    });

    describe('rename', () => {
        it('renames a field without changing the underlying slot clock', () => {
            const slot = sourceSlot({ name: 'Alice' });
            const draft = draftOf(slot);

            draft.rename([], 'name', 'displayName');

            expect(stripSlot(slot)).toEqual({
                displayName: 'Alice'
            });
            expect(slot.v.name).toBeUndefined();
            expect(slot.v.displayName).toMatchObject(clock());
        });

        it('renames a nested field inside its current container', () => {
            const slot = sourceSlot({ profile: { name: 'Alice' } });
            const draft = draftOf(slot);

            draft.rename(['profile'], 'name', 'displayName');

            const profile = expectContainer(slot.v.profile, 'profile');
            expect(stripSlot(slot)).toEqual({
                profile: {
                    displayName: 'Alice'
                }
            });
            expect(profile.v.name).toBeUndefined();
            expect(profile.v.displayName).toMatchObject(clock());
        });

        it('uses the root path when path is omitted', () => {
            const slot = sourceSlot({ name: 'Alice' });
            const draft = draftOf(slot);

            draft.rename('name', 'displayName');

            expect(stripSlot(slot)).toEqual({
                displayName: 'Alice'
            });
            expect(slot.v.displayName).toMatchObject(clock());
        });

        it('throws when renamed field already exists', () => {
            const draft = draftOf(
                sourceSlot({
                    name: 'Alice',
                    displayName: 'Existing'
                })
            );

            expect(() => draft.rename([], 'name', 'displayName')).toThrow(
                'Cannot create field "displayName" because it already exists'
            );
        });
    });

    describe('update', () => {
        it('passes stripped JSON value and writes a replacement with the old clock', () => {
            const slot = sourceSlot({ counter: 4 });
            const draft = draftOf(slot);
            const seen: unknown[] = [];

            draft.update(['counter'], counter => {
                seen.push(counter);
                return Number(counter) + 1;
            });

            expect(seen).toEqual([4]);
            expect(stripSlot(slot)).toEqual({
                counter: 5
            });
            expect(slot.v.counter).toMatchObject(clock());
        });

        it('uses the root path when path is omitted', () => {
            const slot = sourceSlot({ counter: 4 });
            const draft = draftOf(slot);

            draft.update(value => ({
                ...(value as Record<string, JsonValue>),
                counter: 5
            }));

            expect(stripSlot(slot)).toEqual({
                counter: 5
            });
            expect(slot).toMatchObject(clock());
            expect(slot.v.counter).toMatchObject(clock());
        });

        it('physically deletes the target slot when mapper returns undefined', () => {
            const slot = sourceSlot({
                counter: 4,
                keep: 'value'
            });
            const draft = draftOf(slot);

            draft.update(['counter'], () => undefined);

            expect(stripSlot(slot)).toEqual({
                keep: 'value'
            });
            expect(slot.v.counter).toBeUndefined();
        });
    });

    describe('deleteField', () => {
        it('physically removes a root field', () => {
            const slot = sourceSlot({
                legacy: 'drop',
                keep: 'value'
            });
            const draft = draftOf(slot);

            draft.deleteField([], 'legacy');

            expect(stripSlot(slot)).toEqual({
                keep: 'value'
            });
            expect(slot.v.legacy).toBeUndefined();
        });

        it('physically removes a nested field', () => {
            const slot = sourceSlot({
                settings: {
                    legacy: 'drop',
                    keep: 'value'
                }
            });
            const draft = draftOf(slot);

            draft.deleteField(['settings'], 'legacy');

            const settings = expectContainer(slot.v.settings, 'settings');
            expect(stripSlot(slot)).toEqual({
                settings: {
                    keep: 'value'
                }
            });
            expect(settings.v.legacy).toBeUndefined();
        });

        it('uses the root path when path is omitted', () => {
            const slot = sourceSlot({
                legacy: 'drop',
                keep: 'value'
            });
            const draft = draftOf(slot);

            draft.deleteField('legacy');

            expect(stripSlot(slot)).toEqual({
                keep: 'value'
            });
            expect(slot.v.legacy).toBeUndefined();
        });
    });

    describe('move', () => {
        it('moves a raw slot without changing its clock', () => {
            const slot = sourceSlot({ a: true });
            const draft = draftOf(slot);

            draft.newField([], 'b', {}).move(['a'], ['b', 'a']);

            const b = expectContainer(slot.v.b, 'b');
            expect(stripSlot(slot)).toEqual({
                b: {
                    a: true
                }
            });
            expect(slot.v.a).toBeUndefined();
            expect(b).toMatchObject(originClock());
            expect(b.v.a).toMatchObject(clock());
        });

        it('throws instead of creating missing target containers implicitly', () => {
            const draft = draftOf(sourceSlot({ a: true }));

            expect(() => draft.move(['a'], ['missing', 'a'])).toThrow(
                'Patch target must be a container slot'
            );
        });

        it('throws when source is missing', () => {
            const draft = draftOf(sourceSlot({ keep: 'value' }));

            expect(() => draft.move(['missing'], ['keep'])).toThrow(
                'Cannot move missing slot "missing"'
            );
        });

        it('throws when target exists', () => {
            const draft = draftOf(
                sourceSlot({
                    a: true,
                    b: false
                })
            );

            expect(() => draft.move(['a'], ['b'])).toThrow(
                'Cannot create field "b" because it already exists'
            );
        });

        it('throws when moving root, moving to root, or moving into itself', () => {
            expect(() => draftOf(sourceSlot({ a: { b: 'value' } })).move([], ['a'])).toThrow(
                'Cannot move root patch slot'
            );

            expect(() => draftOf(sourceSlot({ a: { b: 'value' } })).move(['a'], [])).toThrow(
                'Move target path cannot be empty'
            );

            expect(() =>
                draftOf(sourceSlot({ a: { b: 'value' } })).move(['a'], ['a', 'b'])
            ).toThrow('Cannot move a slot into itself');
        });
    });

    describe('updateEach', () => {
        it('patches ordered array item value slots', () => {
            const slot = sourceSlot({
                items: [
                    {
                        __setId: 'Main',
                        name: 'Main'
                    }
                ]
            });
            const draft = draftOf(slot);

            draft.updateEach(['items'], item =>
                item.rename([], 'name', 'title').newField([], 'enabled', true)
            );

            const items = expectOrderedArray(slot.v.items, 'items');
            const item = expectContainer(items.v.Main, 'item');
            const value = expectContainer(item.v.value, 'item value');
            expect(stripSlot(slot)).toEqual({
                items: [
                    {
                        __setId: 'Main',
                        title: 'Main',
                        enabled: true
                    }
                ]
            });
            expect(value.v.name).toBeUndefined();
            expect(value.v.title).toMatchObject(clock());
            expect(value.v.enabled).toMatchObject(originClock());
        });

        it('patches record child slots', () => {
            const slot = sourceSlot({
                users: {
                    alice: {
                        name: 'Alice',
                        legacyId: 'old'
                    }
                }
            });
            const draft = draftOf(slot);

            draft.updateEach(['users'], user =>
                user.deleteField([], 'legacyId').newField([], 'active', true)
            );

            const users = expectContainer(slot.v.users, 'users');
            const alice = expectContainer(users.v.alice, 'alice');
            expect(stripSlot(slot)).toEqual({
                users: {
                    alice: {
                        name: 'Alice',
                        active: true
                    }
                }
            });
            expect(alice.v.legacyId).toBeUndefined();
            expect(alice.v.active).toMatchObject(originClock());
        });

        it('uses the root path when path is omitted', () => {
            const slot = sourceSlot({
                alice: {
                    name: 'Alice'
                }
            });
            const draft = draftOf(slot);

            draft.updateEach(user => user.newField('active', true));

            const alice = expectContainer(slot.v.alice, 'alice');
            expect(stripSlot(slot)).toEqual({
                alice: {
                    name: 'Alice',
                    active: true
                }
            });
            expect(alice.v.active).toMatchObject(originClock());
        });

        it('skips tombstone children inside record collections', () => {
            const slot = sourceSlot({
                users: {
                    alice: {
                        name: 'Alice'
                    }
                }
            });
            const users = expectContainer(slot.v.users, 'users');
            users.v.deleted = createTombstoneSlot(8, 'device-2');
            let calls = 0;

            draftOf(slot).updateEach(['users'], user => {
                calls += 1;
                return user.newField([], 'active', true);
            });

            const alice = expectContainer(users.v.alice, 'alice');
            expect(calls).toBe(1);
            expect(stripSlot(slot)).toEqual({
                users: {
                    alice: {
                        name: 'Alice',
                        active: true
                    }
                }
            });
            expect(alice.v.active).toMatchObject(originClock());
            expect(users.v.deleted).toEqual(createTombstoneSlot(8, 'device-2'));
        });

        it('skips tombstone items inside ordered array collections', () => {
            const slot = sourceSlot({
                items: [
                    {
                        __setId: 'live',
                        name: 'Live'
                    },
                    {
                        __setId: 'deleted',
                        name: 'Deleted'
                    }
                ]
            });
            const items = expectOrderedArray(slot.v.items, 'items');
            items.v.deleted = createTombstoneSlot(8, 'device-2');
            let calls = 0;

            draftOf(slot).updateEach(['items'], item => {
                calls += 1;
                return item.newField([], 'active', true);
            });

            const liveItem = expectContainer(items.v.live, 'live item');
            const liveValue = expectContainer(liveItem.v.value, 'live item value');
            expect(calls).toBe(1);
            expect(stripSlot(slot)).toEqual({
                items: [
                    {
                        __setId: 'live',
                        name: 'Live',
                        active: true
                    }
                ]
            });
            expect(liveValue.v.active).toMatchObject(originClock());
            expect(items.v.deleted).toEqual(createTombstoneSlot(8, 'device-2'));
        });

        it('throws when target is not a collection', () => {
            const draft = draftOf(sourceSlot({ value: 'atomic' }));

            expect(() => draft.updateEach(['value'], () => undefined)).toThrow(
                'updateEach target must be an ordered array or record slot'
            );
        });
    });

    describe('deleteEach', () => {
        it('physically removes matching ordered array items and keeps the rest untouched', () => {
            const slot = sourceSlot({
                items: [
                    { __setId: 'keep', kind: 'keep' },
                    { __setId: 'drop', kind: 'drop' }
                ]
            });
            const items = expectOrderedArray(slot.v.items, 'items');
            const kept = items.v.keep;

            draftOf(slot).deleteEach(['items'], value => isKind(value, 'drop'));

            expect(stripSlot(slot)).toEqual({ items: [{ __setId: 'keep', kind: 'keep' }] });
            expect(items.v.drop).toBeUndefined();
            expect(items.v.keep).toBe(kept);
            expect(items).toMatchObject(clock());
        });

        it('physically removes matching record children', () => {
            const slot = sourceSlot({
                users: {
                    alice: { kind: 'keep' },
                    bob: { kind: 'drop' }
                }
            });

            draftOf(slot).deleteEach(['users'], value => isKind(value, 'drop'));

            const users = expectContainer(slot.v.users, 'users');
            expect(stripSlot(slot)).toEqual({ users: { alice: { kind: 'keep' } } });
            expect(users.v.bob).toBeUndefined();
        });

        it('uses the root path when path is omitted', () => {
            const slot = sourceSlot({
                alice: { kind: 'keep' },
                bob: { kind: 'drop' }
            });

            draftOf(slot).deleteEach(value => isKind(value, 'drop'));

            expect(stripSlot(slot)).toEqual({ alice: { kind: 'keep' } });
        });

        it('keeps tombstone items without passing them to the matcher', () => {
            const slot = sourceSlot({
                items: [{ __setId: 'live', kind: 'drop' }]
            });
            const items = expectOrderedArray(slot.v.items, 'items');
            items.v.deleted = createTombstoneSlot(8, 'device-2');
            const seen: unknown[] = [];

            draftOf(slot).deleteEach(['items'], value => {
                seen.push(value);
                return true;
            });

            expect(seen).toEqual([{ __setId: 'live', kind: 'drop' }]);
            expect(items.v.live).toBeUndefined();
            expect(items.v.deleted).toEqual(createTombstoneSlot(8, 'device-2'));
        });

        it('passes the matcher a copy, so a mutating matcher cannot change the tree', () => {
            const slot = sourceSlot({
                items: [{ __setId: 'item', meta: { kind: 'keep' } }],
                users: { alice: { meta: { kind: 'keep' } } }
            });
            const mutate = (value: unknown) => {
                (value as { meta: { kind: string } }).meta.kind = 'changed';
                return false;
            };

            draftOf(slot).deleteEach(['items'], mutate).deleteEach(['users'], mutate);

            expect(stripSlot(slot)).toEqual({
                items: [{ __setId: 'item', meta: { kind: 'keep' } }],
                users: { alice: { meta: { kind: 'keep' } } }
            });
        });

        it('throws when target is not a collection', () => {
            const draft = draftOf(sourceSlot({ value: 'atomic' }));

            expect(() => draft.deleteEach(['value'], () => true)).toThrow(
                'deleteEach target must be an ordered array or record slot'
            );
        });
    });

    describe('when', () => {
        it('applies the mapper when the value at path matches', () => {
            const slot = sourceSlot({
                type: 'BIP39',
                name: 'Main'
            });
            const draft = draftOf(slot);

            draft.when(['type'], 'BIP39', bip39 => bip39.newField([], 'imported', false));

            expect(stripSlot(slot)).toEqual({
                type: 'BIP39',
                name: 'Main',
                imported: false
            });
            expect(slot.v.imported).toMatchObject(originClock());
        });

        it('uses the root path when path is omitted', () => {
            const slot = sourceSlot({
                type: 'BIP39',
                name: 'Main'
            });
            const draft = draftOf(slot);

            draft.when(
                value =>
                    typeof value === 'object' &&
                    value !== null &&
                    !Array.isArray(value) &&
                    (value as Record<string, JsonValue>).type === 'BIP39',
                bip39 => bip39.newField('imported', false)
            );

            expect(stripSlot(slot)).toEqual({
                type: 'BIP39',
                name: 'Main',
                imported: false
            });
            expect(slot.v.imported).toMatchObject(originClock());
        });

        it('does not apply the mapper when the value at path does not match', () => {
            const slot = sourceSlot({
                type: 'WATCH_ONLY',
                name: 'External'
            });
            const draft = draftOf(slot);

            draft.when(['type'], 'BIP39', bip39 => bip39.newField([], 'imported', false));

            expect(stripSlot(slot)).toEqual({
                type: 'WATCH_ONLY',
                name: 'External'
            });
            expect(slot.v.imported).toBeUndefined();
        });

        it('applies the mapper when the predicate matches', () => {
            const slot = sourceSlot({
                type: 'BIP39',
                name: 'Main'
            });
            const draft = draftOf(slot);

            draft.when(
                ['type'],
                value => value === 'BIP39',
                bip39 => bip39.newField([], 'imported', false)
            );

            expect(stripSlot(slot)).toEqual({
                type: 'BIP39',
                name: 'Main',
                imported: false
            });
            expect(slot.v.imported).toMatchObject(originClock());
        });
    });
});

function sourceSlot(value: JsonValue): ContainerSlot {
    return slotFromJson(value, 7, 'device-1') as ContainerSlot;
}

function draftOf(slot: ContainerSlot): RuntimeDraft {
    // the typed deleteEach takes a type guard; the runtime matcher is any predicate
    return createPatchDraft(PatchCursor.root(slot)) as unknown as RuntimeDraft;
}

function clock(): { t: number; a: string } {
    return {
        t: 7,
        a: 'device-1'
    };
}

function originClock(): { t: number; a: string } {
    return {
        t: 0,
        a: ''
    };
}

function expectContainer(slot: Slot | undefined, label: string): ContainerSlot {
    if (!isContainerSlot(slot)) {
        throw new Error(`Expected ${label} to be a container`);
    }

    return slot;
}

function expectOrderedArray(slot: Slot | undefined, label: string) {
    if (!isOrderedArraySlot(slot)) {
        throw new Error(`Expected ${label} to be an ordered array`);
    }

    return slot;
}

function isKind(value: unknown, kind: string): boolean {
    return (
        typeof value === 'object' && value !== null && (value as { kind?: unknown }).kind === kind
    );
}
