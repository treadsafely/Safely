import type { PatchCursor } from './cursor';
import type { PatchDraft } from './types';
import type { JsonValue } from '../../json';
import {
    isContainerSlot,
    isOrderedArraySlot,
    isTombstoneSlot,
    type ContainerSlot,
    type Slot
} from '../../slots';
import { orderedArrayLiveIds, slotFromJson, stripSlot } from '../../slots/slot-json';

type PatchMap = (value: unknown) => JsonValue | undefined;
type ItemPatch = (draft: PatchDraftNode) => unknown;
type PatchMatcher = JsonValue | ((value: unknown) => boolean);
type NewFieldArgs =
    | [path: readonly string[], field: string, defaultValue: JsonValue]
    | [field: string, defaultValue: JsonValue];
type RenameArgs = [path: readonly string[], from: string, to: string] | [from: string, to: string];
type UpdateArgs = [path: readonly string[], map: PatchMap] | [map: PatchMap];
type DeleteFieldArgs = [path: readonly string[], field: string] | [field: string];
type UpdateEachArgs = [path: readonly string[], map: ItemPatch] | [map: ItemPatch];
type ItemMatcher = (value: unknown) => boolean;
type DeleteEachArgs = [path: readonly string[], match: ItemMatcher] | [match: ItemMatcher];
type WhenArgs =
    | [path: readonly string[], value: PatchMatcher, map: ItemPatch]
    | [value: PatchMatcher, map: ItemPatch];

export function createPatchDraft<T>(cursor: PatchCursor): PatchDraft<T> {
    return new PatchDraftNode(cursor) as unknown as PatchDraft<T>;
}

class PatchDraftNode {
    constructor(private readonly cursor: PatchCursor) {}

    public newField(...args: NewFieldArgs): PatchDraftNode {
        const { path, field, defaultValue } = normalizeNewFieldArgs(args);
        const container = this.cursorAt(path).expectContainerSlot();

        assertMissingField(container, field);
        container.v[field] = slotFromJson(defaultValue, 0, '');
        return this;
    }

    public rename(...args: RenameArgs): PatchDraftNode {
        const { path, from, to } = normalizeRenameArgs(args);
        const container = this.cursorAt(path).expectContainerSlot();

        assertMissingField(container, to);

        const slot = container.v[from];
        if (slot !== undefined) {
            container.v[to] = slot;
            delete container.v[from];
        }

        return this;
    }

    public update(...args: UpdateArgs): PatchDraftNode {
        const { path, map } = normalizeUpdateArgs(args);
        const cursor = this.cursorAt(path);
        const current = cursor.readSlot();
        const next = map(stripSlot(current));

        if (next === undefined) {
            cursor.deleteSlot();
            return this;
        }

        cursor.writeSlot(slotFromJsonWithClock(next, current));
        return this;
    }

    public deleteField(...args: DeleteFieldArgs): PatchDraftNode {
        const { path, field } = normalizeDeleteFieldArgs(args);
        delete this.cursorAt(path).expectContainerSlot().v[field];
        return this;
    }

    public move(from: readonly string[], to: readonly string[]): PatchDraftNode {
        if (from.length === 0) {
            throw new Error('Cannot move root patch slot');
        }

        if (to.length === 0) {
            throw new Error('Move target path cannot be empty');
        }

        if (isPathPrefix(from, to)) {
            throw new Error('Cannot move a slot into itself');
        }

        const sourceCursor = this.cursorAt(from);
        const source = sourceCursor.readSlot();
        if (source === undefined) {
            throw new Error(`Cannot move missing slot "${formatPath(from)}"`);
        }

        const target = splitFieldPath(to);
        const targetContainer = this.cursorAt(target.path).expectContainerSlot();
        assertMissingField(targetContainer, target.field);

        targetContainer.v[target.field] = source;
        sourceCursor.deleteSlot();
        return this;
    }

    public updateEach(...args: UpdateEachArgs): PatchDraftNode {
        const { path, map } = normalizeUpdateEachArgs(args);
        const cursor = this.cursorAt(path);
        const slot = cursor.readSlot();

        if (slot === undefined || isTombstoneSlot(slot)) {
            return this;
        }

        if (isOrderedArraySlot(slot)) {
            for (const id of orderedArrayLiveIds(slot)) {
                map(createPatchDraftNode(cursor.orderedArrayValue(id)));
            }
            return this;
        }

        if (isContainerSlot(slot)) {
            for (const key of Object.keys(slot.v)) {
                const child = slot.v[key];
                if (child !== undefined && !isTombstoneSlot(child)) {
                    map(createPatchDraftNode(cursor.field(key)));
                }
            }
            return this;
        }

        throw new Error('updateEach target must be an ordered array or record slot');
    }

    public deleteEach(...args: DeleteEachArgs): PatchDraftNode {
        const { path, match } = normalizeDeleteEachArgs(args);
        const cursor = this.cursorAt(path);
        const slot = cursor.readSlot();

        if (slot === undefined || isTombstoneSlot(slot)) {
            return this;
        }

        if (isOrderedArraySlot(slot)) {
            for (const id of orderedArrayLiveIds(slot)) {
                const item = cursor.orderedArrayValue(id);
                if (match(item.readValue())) {
                    item.deleteSlot();
                }
            }
            return this;
        }

        if (isContainerSlot(slot)) {
            for (const key of Object.keys(slot.v)) {
                const child = slot.v[key];
                if (
                    child !== undefined &&
                    !isTombstoneSlot(child) &&
                    match(cursor.field(key).readValue())
                ) {
                    delete slot.v[key];
                }
            }
            return this;
        }

        throw new Error('deleteEach target must be an ordered array or record slot');
    }

    public when(...args: WhenArgs): PatchDraftNode {
        const { path, value, map } = normalizeWhenArgs(args);
        const current = this.cursorAt(path).readValue();
        const matches = typeof value === 'function' ? value(current) : current === value;

        if (matches) {
            map(this);
        }

        return this;
    }

    private cursorAt(path: readonly string[]): PatchCursor {
        return path.reduce<PatchCursor>((cursor, key) => cursor.field(key), this.cursor);
    }
}

function createPatchDraftNode(cursor: PatchCursor): PatchDraftNode {
    return new PatchDraftNode(cursor);
}

function normalizeNewFieldArgs(args: NewFieldArgs): {
    path: readonly string[];
    field: string;
    defaultValue: JsonValue;
} {
    if (args.length === 3) {
        const [path, field, defaultValue] = args;
        return {
            path,
            field,
            defaultValue
        };
    }

    const [field, defaultValue] = args;
    return {
        path: [],
        field,
        defaultValue
    };
}

function normalizeRenameArgs(args: RenameArgs): {
    path: readonly string[];
    from: string;
    to: string;
} {
    if (args.length === 3) {
        const [path, from, to] = args;
        return {
            path,
            from,
            to
        };
    }

    const [from, to] = args;
    return {
        path: [],
        from,
        to
    };
}

function normalizeUpdateArgs(args: UpdateArgs): { path: readonly string[]; map: PatchMap } {
    if (args.length === 2) {
        const [path, map] = args;
        return {
            path,
            map
        };
    }

    const [map] = args;
    return {
        path: [],
        map
    };
}

function normalizeDeleteFieldArgs(args: DeleteFieldArgs): {
    path: readonly string[];
    field: string;
} {
    if (args.length === 2) {
        const [path, field] = args;
        return {
            path,
            field
        };
    }

    const [field] = args;
    return {
        path: [],
        field
    };
}

function normalizeUpdateEachArgs(args: UpdateEachArgs): {
    path: readonly string[];
    map: ItemPatch;
} {
    if (args.length === 2) {
        const [path, map] = args;
        return {
            path,
            map
        };
    }

    const [map] = args;
    return {
        path: [],
        map
    };
}

function normalizeDeleteEachArgs(args: DeleteEachArgs): {
    path: readonly string[];
    match: ItemMatcher;
} {
    if (args.length === 2) {
        const [path, match] = args;
        return {
            path,
            match
        };
    }

    const [match] = args;
    return {
        path: [],
        match
    };
}

function normalizeWhenArgs(args: WhenArgs): {
    path: readonly string[];
    value: PatchMatcher;
    map: ItemPatch;
} {
    if (args.length === 3) {
        const [path, value, map] = args;
        return {
            path,
            value,
            map
        };
    }

    const [value, map] = args;
    return {
        path: [],
        value,
        map
    };
}

function assertMissingField(container: ContainerSlot, field: string): void {
    if (
        Object.prototype.hasOwnProperty.call(container.v, field) &&
        container.v[field] !== undefined
    ) {
        throw new Error(`Cannot create field "${field}" because it already exists`);
    }
}

function slotFromJsonWithClock(value: JsonValue, current: Slot | undefined): Slot {
    return slotFromJson(value, current?.t ?? 0, current?.a ?? '');
}

function splitFieldPath(path: readonly string[]): { path: readonly string[]; field: string } {
    const field = path[path.length - 1];
    if (field === undefined) {
        throw new Error('Field path cannot be empty');
    }

    return {
        path: path.slice(0, -1),
        field
    };
}

function isPathPrefix(prefix: readonly string[], path: readonly string[]): boolean {
    return prefix.length <= path.length && prefix.every((part, index) => path[index] === part);
}

function formatPath(path: readonly string[]): string {
    return path.join('.');
}
