export type {
    DeepReadonly,
    JsonArray,
    JsonObject,
    JsonPrimitive,
    JsonValue,
    Path,
    PathValue
} from './core/json';
export type {
    ArrayDraft,
    AtomicDraft,
    Draft,
    EntryDraft,
    NullableDraft,
    ObjectDraft
} from './core/write';

export type { Clock } from './core/clock';
export { systemClock } from './core/clock';

export { SlotRevision } from './core/slot-revision';
export { createStorage, createStorageFromSnapshot, StorageObservers } from './core/slot-tree';
export type { SlotTree, StorageImpl } from './core/slot-tree';
export type { StorageObserver } from './core/slot-tree';

export type { StorageVersion } from './core/versioning/version';
export { patch } from './core/versioning/patch';
export type { PatchDraft, PatchPath, SlotPatch } from './core/versioning/patch';
export {
    DEVICES_KEY,
    VERSION_DELETION_GRACE_PERIOD_SECONDS,
    VERSION_DELETION_KEY,
    VersionController
} from './core/versioning/version-controller';
export type { VersionSelector } from './core/versioning/version-controller';

export type { HNil, HCons, AssertVersionHList, NewOf } from './core/versioning/version';
export { hCons, hNil, defineVersionHList } from './core/versioning/version';
export { cloneSlot as projectIdentity } from './core/slots/slot-json';
export { zIndexedObject, zIndexedArray } from './core/schemas';
export type { ZIndexedObject, ZIndexedSerializer } from './core/schemas';
