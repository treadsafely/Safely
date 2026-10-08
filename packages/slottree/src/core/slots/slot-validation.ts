import type { JsonValue } from '../json';
import {
    assertValidTimestamp,
    isOrderedArrayOrderIndex,
    ORDERED_ARRAY_ITEM_ID_KEY,
    SlotKind,
    type ContainerSlot,
    type Slot
} from './slot';
import { stripSlot } from './slot-json';

export function validateSlotTreeRoot(root: unknown): asserts root is ContainerSlot {
    validateSlot(root);

    if (root.s !== SlotKind.Container || root.t !== 0 || root.a !== '') {
        throw new Error('Slot tree root must be an origin container slot');
    }
}

export function validateSlot(slot: unknown): asserts slot is Slot {
    validateSlotInner(slot, 0);
}

function validateSlotInner(slot: unknown, depth: number): void {
    const record = validateSlotRecord(slot);
    validateSlotMetadata(record);
    validateSlotKind(record.s);

    if (record.s === SlotKind.Container) {
        validateContainerSlotValue(record.v, depth);
        return;
    }

    if (record.s === SlotKind.OrderedArray) {
        validateOrderedArraySlotValue(record.v, depth);
        return;
    }

    if (record.s === SlotKind.Tombstone) {
        return;
    }

    validateAtomicSlotValue(record.v, depth);
}

function validateSlotRecord(slot: unknown): Record<string, unknown> {
    if (slot === null || typeof slot !== 'object') {
        throw new Error('Slot must be an object');
    }

    return slot as Record<string, unknown>;
}

function validateSlotMetadata(record: Record<string, unknown>): void {
    assertValidTimestamp(record.t);

    if (typeof record.a !== 'string') {
        throw new Error('Slot author must be a string');
    }

    if (record.a === '' && record.t !== 0) {
        throw new Error('Non-origin slot author must not be empty');
    }
}

function validateSlotKind(kind: unknown): asserts kind is Slot['s'] {
    if (
        kind !== SlotKind.Atomic &&
        kind !== SlotKind.Container &&
        kind !== SlotKind.Tombstone &&
        kind !== SlotKind.OrderedArray
    ) {
        throw new Error('Slot kind must be a known numeric discriminant');
    }
}

function validateContainerSlotValue(value: unknown, depth: number): void {
    if (value === null || typeof value !== 'object') {
        throw new Error('Container slot value must be an object');
    }

    for (const key of Object.keys(value)) {
        const child = (value as Record<string, unknown>)[key];
        if (child !== undefined) {
            validateSlotInner(child, depth + 1);
        }
    }
}

function validateOrderedArraySlotValue(value: unknown, depth: number): void {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Ordered array slot value must be an object');
    }

    for (const key of Object.keys(value)) {
        const child = (value as Record<string, unknown>)[key];
        if (child === undefined) {
            continue;
        }

        validateSlotInner(child, depth + 1);
        validateOrderedArrayItem(key, child);
    }
}

function validateAtomicSlotValue(value: unknown, depth: number): void {
    if (!isJsonValue(value, depth + 1)) {
        throw new Error('Atomic slot value must be JSON-compatible');
    }
}

function validateOrderedArrayItem(key: string, item: unknown): void {
    if (item === null || typeof item !== 'object') {
        throw new Error(`Ordered array item "${key}" must be an object`);
    }

    const record = item as Record<string, unknown>;
    if (record.s === SlotKind.Tombstone) {
        return;
    }

    if (record.s !== SlotKind.Container) {
        throw new Error(`Ordered array item "${key}" must be a container or tombstone`);
    }

    const values = record.v as Record<string, unknown>;
    const order = values.order as Record<string, unknown> | undefined;
    if (order === undefined || order.s !== SlotKind.Atomic || !isOrderedArrayOrderIndex(order.v)) {
        throw new Error(`Ordered array item "${key}" order must be a 32-bit integer atomic slot`);
    }

    const value = values.value;
    if (value === undefined) {
        throw new Error(`Ordered array item "${key}" value must be a valid slot`);
    }

    if ((value as Record<string, unknown>).s === SlotKind.Tombstone) {
        throw new Error(`Ordered array item "${key}" value must not be a tombstone`);
    }

    const stripped = stripSlot(value as Slot);
    if (
        stripped !== undefined &&
        stripped !== null &&
        typeof stripped === 'object' &&
        !Array.isArray(stripped) &&
        typeof stripped[ORDERED_ARRAY_ITEM_ID_KEY] === 'string' &&
        stripped[ORDERED_ARRAY_ITEM_ID_KEY] !== key
    ) {
        throw new Error(
            `Ordered array item "${key}" value ${ORDERED_ARRAY_ITEM_ID_KEY} must match its map key`
        );
    }
}

function isJsonValue(value: unknown, depth: number): value is JsonValue {
    if (depth > 1000) {
        throw new Error('JSON value is too deep');
    }

    if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return typeof value !== 'number' || Number.isFinite(value);
    }

    if (Array.isArray(value)) {
        return value.every(item => isJsonValue(item, depth + 1));
    }

    if (typeof value === 'object') {
        for (const key of Object.keys(value)) {
            if (!isJsonValue((value as Record<string, unknown>)[key], depth + 1)) {
                return false;
            }
        }

        return true;
    }

    return false;
}
