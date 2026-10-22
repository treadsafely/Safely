import { z } from 'zod';

import { zIndexedArray, zIndexedObject, type DeepReadonly } from '../../../src';
import { patch } from '../../../src/core/versioning/patch';
import { defineVersionHList, hCons, hNil } from '../../../src/core/versioning/version';

const Scalar = z.string();

export const arrayItemV1 = zIndexedObject(
    {
        id: Scalar,
        itemName: Scalar,
        count: z.number()
    },
    value => value.id
);

export const arrayItemV2 = zIndexedObject(
    {
        id: Scalar,
        itemTitle: Scalar,
        count: z.number(),
        added: z.boolean()
    },
    value => value.id
);

export const unionBip39V1 = zIndexedObject(
    {
        id: Scalar,
        type: z.literal('BIP39'),
        secret: Scalar
    },
    value => value.id
);

export const unionBip39V2 = zIndexedObject(
    {
        id: Scalar,
        type: z.literal('BIP39'),
        secret: Scalar,
        migrated: z.boolean()
    },
    value => value.id
);

export const unionWatchOnly = zIndexedObject(
    {
        id: Scalar,
        type: z.literal('WATCH_ONLY'),
        label: Scalar
    },
    value => value.id
);

export const unionDevnet = zIndexedObject(
    {
        id: Scalar,
        type: z.literal('DEVNET'),
        address: Scalar
    },
    value => value.id
);

const unionItemV3 = z.discriminatedUnion('type', [unionBip39V2, unionWatchOnly, unionDevnet]);

const recordItemV1 = z.object({
    itemName: Scalar,
    count: z.number()
});

const recordItemV2 = z.object({
    itemTitle: Scalar,
    count: z.number(),
    added: z.boolean()
});

export const versioningSchemaV1 = z.object({
    stable: Scalar,
    renameA: Scalar,
    deleteMe: Scalar,
    updateNumber: z.number(),
    moveMe: Scalar,
    arrayItems: zIndexedArray(arrayItemV1),
    recordItems: z.record(z.string(), recordItemV1),
    unionItems: zIndexedArray(z.discriminatedUnion('type', [unionBip39V1, unionWatchOnly]))
});

export const versioningSchemaV2 = z.object({
    stable: Scalar,
    renamedB: Scalar,
    addedV2: Scalar,
    updateNumber: z.number(),
    wrapped: z.object({
        moveMe: Scalar
    }),
    arrayItems: zIndexedArray(arrayItemV2),
    recordItems: z.record(z.string(), recordItemV2),
    unionItems: zIndexedArray(z.discriminatedUnion('type', [unionBip39V2, unionWatchOnly]))
});

export const versioningSchemaV3 = z.object({
    stableV3: Scalar,
    renamedC: Scalar,
    addedV2: Scalar,
    deleteMe: Scalar,
    v3Note: Scalar,
    updateNumber: z.number(),
    wrapped: z.object({
        moveMe: Scalar
    }),
    arrayItems: zIndexedArray(arrayItemV2),
    recordItems: z.record(z.string(), recordItemV2),
    unionItems: zIndexedArray(unionItemV3)
});

export type VersioningStateV1 = z.output<typeof versioningSchemaV1>;
export type VersioningStateV2 = z.output<typeof versioningSchemaV2>;
export type VersioningStateV3 = z.output<typeof versioningSchemaV3>;

export const versioningInitialV1: VersioningStateV1 = {
    stable: '',
    renameA: '',
    deleteMe: '',
    updateNumber: 0,
    moveMe: '',
    arrayItems: [],
    recordItems: {},
    unionItems: []
};

export const versioningInitialV2: VersioningStateV2 = {
    stable: '',
    renamedB: '',
    addedV2: '',
    updateNumber: 1,
    wrapped: {
        moveMe: ''
    },
    arrayItems: [],
    recordItems: {},
    unionItems: []
};

export const versioningInitialV3: VersioningStateV3 = {
    stableV3: '',
    renamedC: '',
    addedV2: '',
    deleteMe: '',
    v3Note: '',
    updateNumber: 2,
    wrapped: {
        moveMe: ''
    },
    arrayItems: [],
    recordItems: {},
    unionItems: []
};

const projectV1ToV2 = patch(versioningSchemaV1, versioningSchemaV2, draft =>
    draft
        .rename([], 'renameA', 'renamedB')
        .deleteField([], 'deleteMe')
        .newField([], 'addedV2', '')
        .update(['updateNumber'], value => value + 1)
        .newField([], 'wrapped', {})
        .move(['moveMe'], ['wrapped', 'moveMe'])
        .updateEach(['arrayItems'], item =>
            item
                .rename([], 'itemName', 'itemTitle')
                .update(['count'], value => value + 1)
                .newField([], 'added', true)
        )
        .updateEach(['recordItems'], item =>
            item
                .rename([], 'itemName', 'itemTitle')
                .update(['count'], value => value + 1)
                .newField([], 'added', true)
        )
        .updateEach(['unionItems'], item =>
            item.when(['type'], 'BIP39', bip39 => bip39.newField([], 'migrated', true))
        )
);

const projectV2ToV1 = patch(versioningSchemaV2, versioningSchemaV1, draft =>
    draft
        .rename([], 'renamedB', 'renameA')
        .deleteField([], 'addedV2')
        .newField([], 'deleteMe', '')
        .update(['updateNumber'], value => value - 1)
        .move(['wrapped', 'moveMe'], ['moveMe'])
        .deleteField([], 'wrapped')
        .updateEach(['arrayItems'], item =>
            item
                .rename([], 'itemTitle', 'itemName')
                .update(['count'], value => value - 1)
                .deleteField([], 'added')
        )
        .updateEach(['recordItems'], item =>
            item
                .rename([], 'itemTitle', 'itemName')
                .update(['count'], value => value - 1)
                .deleteField([], 'added')
        )
        .updateEach(['unionItems'], item =>
            item.when(['type'], 'BIP39', bip39 => bip39.deleteField([], 'migrated'))
        )
);

const projectV2ToV3 = patch(versioningSchemaV2, versioningSchemaV3, draft =>
    draft
        .rename([], 'stable', 'stableV3')
        .rename([], 'renamedB', 'renamedC')
        .newField([], 'deleteMe', '')
        .newField([], 'v3Note', '')
        .update(['updateNumber'], value => value + 1)
);

const isUnionDevnet = (
    item: DeepReadonly<z.output<typeof unionItemV3>>
): item is DeepReadonly<z.output<typeof unionDevnet>> => item.type === 'DEVNET';

const projectV3ToV2 = patch(versioningSchemaV3, versioningSchemaV2, draft =>
    draft
        .deleteEach(['unionItems'], isUnionDevnet)
        .rename([], 'stableV3', 'stable')
        .rename([], 'renamedC', 'renamedB')
        .deleteField([], 'deleteMe')
        .deleteField([], 'v3Note')
        .update(['updateNumber'], value => value - 1)
);

export const versioningV1 = defineVersionHList(
    hCons(
        {
            version: 1,
            schema: versioningSchemaV1,
            initial: versioningInitialV1,
            projectUp: slot => slot,
            projectDown: slot => slot
        },
        hNil
    )
);

export const versioningV2 = defineVersionHList(
    hCons(
        {
            version: 2,
            schema: versioningSchemaV2,
            initial: versioningInitialV2,
            projectUp: projectV1ToV2,
            projectDown: projectV2ToV1
        },
        hCons(
            {
                version: 1,
                schema: versioningSchemaV1,
                initial: versioningInitialV1,
                projectUp: slot => slot,
                projectDown: slot => slot
            },
            hNil
        )
    )
);

export const versioningV3 = defineVersionHList(
    hCons(
        {
            version: 3,
            schema: versioningSchemaV3,
            initial: versioningInitialV3,
            projectUp: projectV2ToV3,
            projectDown: projectV3ToV2
        },
        hCons(
            {
                version: 2,
                schema: versioningSchemaV2,
                initial: versioningInitialV2,
                projectUp: projectV1ToV2,
                projectDown: projectV2ToV1
            },
            hCons(
                {
                    version: 1,
                    schema: versioningSchemaV1,
                    initial: versioningInitialV1,
                    projectUp: slot => slot,
                    projectDown: slot => slot
                },
                hNil
            )
        )
    )
);
