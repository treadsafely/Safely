import fc from 'fast-check';

import {
    arrayItemV1,
    arrayItemV2,
    unionBip39V1,
    unionBip39V2,
    unionDevnet,
    unionWatchOnly,
    type VersioningStateV1,
    type VersioningStateV2,
    type VersioningStateV3
} from './stress-schema';
import type { SlotTree } from '../../../src';

export type DeviceIndex = 1 | 2 | 3;

type LogicalArrayItem = {
    id: string;
    value: string;
    count: number;
};

type LogicalRecordItem = {
    value: string;
    count: number;
};

type LogicalUnionItem =
    | {
          id: string;
          type: 'BIP39';
          secret: string;
      }
    | {
          id: string;
          type: 'WATCH_ONLY';
          label: string;
      }
    | {
          id: string;
          type: 'DEVNET';
          address: string;
      };

type LegacyUnionItem = Exclude<LogicalUnionItem, { type: 'DEVNET' }>;

export type VersioningOp =
    | { type: 'stable.set'; value: string }
    | { type: 'renamed.set'; value: string }
    | { type: 'deleted.set'; value: string }
    | { type: 'addedV2.set'; value: string }
    | { type: 'v3Note.set'; value: string }
    | { type: 'updateNumber.set'; value: number }
    | { type: 'moved.set'; value: string }
    | { type: 'arrayItems.set'; value: LogicalArrayItem[] }
    | { type: 'recordItems.setEntry'; key: string; value: LogicalRecordItem }
    | { type: 'recordItems.deleteEntry'; key: string }
    | { type: 'unionItems.set'; value: LogicalUnionItem[] };

export type DeviceOp = {
    device: DeviceIndex;
    op: VersioningOp;
};

type StorageV1 = SlotTree<VersioningStateV1>;
type StorageV2 = SlotTree<VersioningStateV2>;
type StorageV3 = SlotTree<VersioningStateV3>;

export type VersioningWorld = {
    1: StorageV1;
    2: StorageV2;
    3: StorageV3;
};

const safeString = fc.string({ maxLength: 20 });
const stableKeys = ['a', 'b', 'c', 'd', 'e'] as const;
const keyArb = fc.constantFrom(...stableKeys);
const idArb = fc.constantFrom(...stableKeys);
const countArb = fc.integer({ min: -100, max: 100 });

const arrayItemArb = fc.record({
    id: idArb,
    value: safeString,
    count: countArb
});

const arrayItemsArb = fc.uniqueArray(arrayItemArb, {
    maxLength: 4,
    selector: item => item.id
});

const recordItemArb = fc.record({
    value: safeString,
    count: countArb
});

const unionItemArb = fc.oneof(
    fc.record({
        id: idArb,
        type: fc.constant('BIP39' as const),
        secret: safeString
    }),
    fc.record({
        id: idArb,
        type: fc.constant('WATCH_ONLY' as const),
        label: safeString
    }),
    fc.record({
        id: idArb,
        type: fc.constant('DEVNET' as const),
        address: safeString
    })
);

const unionItemsArb = fc.uniqueArray(unionItemArb, {
    maxLength: 4,
    selector: item => item.id
});

export const versioningOpArb: fc.Arbitrary<VersioningOp> = fc.oneof(
    safeString.map(value => ({
        type: 'stable.set' as const,
        value
    })),
    safeString.map(value => ({
        type: 'renamed.set' as const,
        value
    })),
    safeString.map(value => ({
        type: 'deleted.set' as const,
        value
    })),
    safeString.map(value => ({
        type: 'addedV2.set' as const,
        value
    })),
    safeString.map(value => ({
        type: 'v3Note.set' as const,
        value
    })),
    countArb.map(value => ({
        type: 'updateNumber.set' as const,
        value
    })),
    safeString.map(value => ({
        type: 'moved.set' as const,
        value
    })),
    arrayItemsArb.map(value => ({
        type: 'arrayItems.set' as const,
        value
    })),
    fc
        .record({
            key: keyArb,
            value: recordItemArb
        })
        .map(({ key, value }) => ({
            type: 'recordItems.setEntry' as const,
            key,
            value
        })),
    keyArb.map(key => ({
        type: 'recordItems.deleteEntry' as const,
        key
    })),
    unionItemsArb.map(value => ({
        type: 'unionItems.set' as const,
        value
    }))
);

export const deviceOpArb: fc.Arbitrary<DeviceOp> = fc.record({
    device: fc.constantFrom(1, 2, 3),
    op: versioningOpArb
});

export const deviceOpsArb = fc.array(deviceOpArb, { maxLength: 30 });

export function applyDeviceOps(world: VersioningWorld, ops: readonly DeviceOp[]): void {
    for (const { device, op } of ops) {
        applyDeviceOp(world, device, op);
    }
}

function applyDeviceOp(world: VersioningWorld, device: DeviceIndex, op: VersioningOp): void {
    switch (device) {
        case 1:
            applyV1Op(world[1], op);
            return;

        case 2:
            applyV2Op(world[2], op);
            return;

        case 3:
            applyV3Op(world[3], op);
            return;
    }
}

function applyV1Op(storage: StorageV1, op: VersioningOp): void {
    storage.transaction(draft => {
        switch (op.type) {
            case 'stable.set':
                draft.set('stable', op.value);
                return;

            case 'renamed.set':
                draft.set('renameA', op.value);
                return;

            case 'deleted.set':
                draft.set('deleteMe', op.value);
                return;

            case 'updateNumber.set':
                draft.set('updateNumber', op.value);
                return;

            case 'moved.set':
                draft.set('moveMe', op.value);
                return;

            case 'arrayItems.set':
                draft.set('arrayItems', op.value.map(toArrayItemV1));
                return;

            case 'recordItems.setEntry':
                draft.at('recordItems').set(op.key, toRecordItemV1(op.value));
                return;

            case 'recordItems.deleteEntry':
                draft.at('recordItems').delete(op.key);
                return;

            case 'unionItems.set':
                draft.set('unionItems', op.value.filter(isLegacyUnionItem).map(toUnionItemV1));
                return;

            case 'addedV2.set':
            case 'v3Note.set':
                return;
        }
    });
}

function applyV2Op(storage: StorageV2, op: VersioningOp): void {
    storage.transaction(draft => {
        switch (op.type) {
            case 'stable.set':
                draft.set('stable', op.value);
                return;

            case 'renamed.set':
                draft.set('renamedB', op.value);
                return;

            case 'addedV2.set':
                draft.set('addedV2', op.value);
                return;

            case 'updateNumber.set':
                draft.set('updateNumber', op.value + 1);
                return;

            case 'moved.set':
                draft.at('wrapped').set('moveMe', op.value);
                return;

            case 'arrayItems.set':
                draft.set('arrayItems', op.value.map(toArrayItemV2));
                return;

            case 'recordItems.setEntry':
                draft.at('recordItems').set(op.key, toRecordItemV2(op.value));
                return;

            case 'recordItems.deleteEntry':
                draft.at('recordItems').delete(op.key);
                return;

            case 'unionItems.set':
                draft.set('unionItems', op.value.filter(isLegacyUnionItem).map(toUnionItemV2));
                return;

            case 'deleted.set':
            case 'v3Note.set':
                return;
        }
    });
}

function applyV3Op(storage: StorageV3, op: VersioningOp): void {
    storage.transaction(draft => {
        switch (op.type) {
            case 'stable.set':
                draft.set('stableV3', op.value);
                return;

            case 'renamed.set':
                draft.set('renamedC', op.value);
                return;

            case 'deleted.set':
                draft.set('deleteMe', op.value);
                return;

            case 'v3Note.set':
                draft.set('v3Note', op.value);
                return;

            case 'addedV2.set':
                draft.set('addedV2', op.value);
                return;

            case 'updateNumber.set':
                draft.set('updateNumber', op.value + 2);
                return;

            case 'moved.set':
                draft.at('wrapped').set('moveMe', op.value);
                return;

            case 'arrayItems.set':
                draft.set('arrayItems', op.value.map(toArrayItemV2));
                return;

            case 'recordItems.setEntry':
                draft.at('recordItems').set(op.key, toRecordItemV2(op.value));
                return;

            case 'recordItems.deleteEntry':
                draft.at('recordItems').delete(op.key);
                return;

            case 'unionItems.set':
                draft.set('unionItems', op.value.map(toUnionItemV3));
                return;
        }
    });
}

function toArrayItemV1(item: LogicalArrayItem): VersioningStateV1['arrayItems'][number] {
    return arrayItemV1.toJson({
        id: item.id,
        itemName: item.value,
        count: item.count
    });
}

function toArrayItemV2(item: LogicalArrayItem): VersioningStateV2['arrayItems'][number] {
    return arrayItemV2.toJson({
        id: item.id,
        itemTitle: item.value,
        count: item.count + 1,
        added: true
    });
}

function toRecordItemV1(item: LogicalRecordItem): VersioningStateV1['recordItems'][string] {
    return {
        itemName: item.value,
        count: item.count
    };
}

function toRecordItemV2(item: LogicalRecordItem): VersioningStateV2['recordItems'][string] {
    return {
        itemTitle: item.value,
        count: item.count + 1,
        added: true
    };
}

function toUnionItemV1(item: LegacyUnionItem): VersioningStateV1['unionItems'][number] {
    switch (item.type) {
        case 'BIP39':
            return unionBip39V1.toJson({
                id: item.id,
                type: 'BIP39',
                secret: item.secret
            });

        case 'WATCH_ONLY':
            return unionWatchOnly.toJson({
                id: item.id,
                type: 'WATCH_ONLY',
                label: item.label
            });
    }
}

function toUnionItemV2(item: LegacyUnionItem): VersioningStateV2['unionItems'][number] {
    switch (item.type) {
        case 'BIP39':
            return unionBip39V2.toJson({
                id: item.id,
                type: 'BIP39',
                secret: item.secret,
                migrated: true
            });

        case 'WATCH_ONLY':
            return unionWatchOnly.toJson({
                id: item.id,
                type: 'WATCH_ONLY',
                label: item.label
            });
    }
}

function toUnionItemV3(item: LogicalUnionItem): VersioningStateV3['unionItems'][number] {
    if (item.type === 'DEVNET') {
        return unionDevnet.toJson({
            id: item.id,
            type: 'DEVNET',
            address: item.address
        });
    }

    return toUnionItemV2(item);
}

function isLegacyUnionItem(item: LogicalUnionItem): item is LegacyUnionItem {
    return item.type !== 'DEVNET';
}
