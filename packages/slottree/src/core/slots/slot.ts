import { z } from 'zod';

import { createNullPrototypeRecord, type JsonObject, type JsonValue } from '../json';

export const SlotKind = {
    Atomic: 0,
    Container: 1,
    Tombstone: 2,
    OrderedArray: 3
} as const;

export const ORDERED_ARRAY_ITEM_ID_KEY = '__setId';
export const ORDERED_ARRAY_ITEM_ID_KEY_TYPE = z.string();
export const ORDERED_ARRAY_ORDER_MIN = -(2 ** 31);
export const ORDERED_ARRAY_ORDER_MAX = 2 ** 31 - 1;

export interface AtomicSlot {
    s: typeof SlotKind.Atomic;
    v: JsonValue;
    t: number;
    a: string;
}

export interface TombstoneSlot {
    s: typeof SlotKind.Tombstone;
    t: number;
    a: string;
}

export interface ContainerSlot {
    s: typeof SlotKind.Container;
    v: SlotMap;
    t: number;
    a: string;
}

export interface OrderedArraySlot {
    s: typeof SlotKind.OrderedArray;
    v: SlotMap;
    t: number;
    a: string;
}

export type Slot = AtomicSlot | TombstoneSlot | ContainerSlot | OrderedArraySlot;
export type SlotMap = { [key: string]: Slot | undefined };

export function createSlotMap(): SlotMap {
    return createNullPrototypeRecord<Slot | undefined>();
}

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
    return (
        value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
    );
}

export function isContainerSlot(slot: Slot | undefined): slot is ContainerSlot {
    return slot !== undefined && slot.s === SlotKind.Container;
}

export function isOrderedArraySlot(slot: Slot | undefined): slot is OrderedArraySlot {
    return slot !== undefined && slot.s === SlotKind.OrderedArray;
}

export function isRecursiveSlot(slot: Slot | undefined): slot is ContainerSlot | OrderedArraySlot {
    return isContainerSlot(slot) || isOrderedArraySlot(slot);
}

export function isTombstoneSlot(slot: Slot | undefined): slot is TombstoneSlot {
    return slot !== undefined && slot.s === SlotKind.Tombstone;
}

export function assertValidTimestamp(timestamp: unknown): asserts timestamp is number {
    if (typeof timestamp !== 'number' || !Number.isSafeInteger(timestamp) || timestamp < 0) {
        throw new Error('Slot timestamp must be a non-negative safe integer');
    }
}

export function isOrderedArrayOrderIndex(value: unknown): value is number {
    return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= ORDERED_ARRAY_ORDER_MIN &&
        value <= ORDERED_ARRAY_ORDER_MAX
    );
}

export function createContainerSlot(
    timestamp: number,
    author: string,
    values: SlotMap = createSlotMap()
): ContainerSlot {
    return { s: SlotKind.Container, v: values, t: timestamp, a: author };
}

export function createOriginContainer(values: SlotMap = createSlotMap()): ContainerSlot {
    return createContainerSlot(0, '', values);
}

export function createOrderedArraySlot(
    timestamp: number,
    author: string,
    values: SlotMap = createSlotMap()
): OrderedArraySlot {
    return { s: SlotKind.OrderedArray, v: values, t: timestamp, a: author };
}

export function createOriginOrderedArray(values: SlotMap = createSlotMap()): OrderedArraySlot {
    return createOrderedArraySlot(0, '', values);
}

export function createTombstoneSlot(timestamp: number, author: string): TombstoneSlot {
    return { s: SlotKind.Tombstone, t: timestamp, a: author };
}
