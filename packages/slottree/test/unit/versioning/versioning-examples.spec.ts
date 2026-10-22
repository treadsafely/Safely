import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { DeepReadonly } from '../../../src/core/json';
import { zIndexedArray, zIndexedObject } from '../../../src/core/schemas';
import {
    isContainerSlot,
    isOrderedArraySlot,
    type ContainerSlot,
    type Slot
} from '../../../src/core/slots';
import { slotFromJson, stripSlot } from '../../../src/core/slots/slot-json';
import { patch } from '../../../src/core/versioning/patch';

describe('versioning patch examples', () => {
    it('renames a root field', () => {
        const v1Schema = z.object({
            name: z.string()
        });
        const v2Schema = z.object({
            displayName: z.string()
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.rename([], 'name', 'displayName')
        );

        const migrated = projectUp(slotFromJson({ name: 'Alice' }, 7, 'device-1') as ContainerSlot);

        expect(stripSlot(migrated)).toEqual({
            displayName: 'Alice'
        });
        expect(migrated.v.displayName).toMatchObject({
            t: 7,
            a: 'device-1'
        });
    });

    it('renames a nested field', () => {
        const v1Schema = z.object({
            profile: z.object({
                name: z.string()
            })
        });
        const v2Schema = z.object({
            profile: z.object({
                displayName: z.string()
            })
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.rename(['profile'], 'name', 'displayName')
        );

        const migrated = projectUp(
            slotFromJson({ profile: { name: 'Alice' } }, 7, 'device-1') as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            profile: {
                displayName: 'Alice'
            }
        });

        const profile = expectContainer(migrated.v.profile, 'profile');
        expect(profile.v.displayName).toMatchObject({
            t: 7,
            a: 'device-1'
        });
    });

    it('deletes root and nested fields', () => {
        const v1Schema = z.object({
            name: z.string(),
            legacyFlag: z.boolean(),
            settings: z.object({
                theme: z.string(),
                legacyFlag: z.boolean()
            })
        });
        const v2Schema = z.object({
            name: z.string(),
            settings: z.object({
                theme: z.string()
            })
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.deleteField([], 'legacyFlag').deleteField(['settings'], 'legacyFlag')
        );

        const migrated = projectUp(
            slotFromJson(
                {
                    name: 'Alice',
                    legacyFlag: true,
                    settings: {
                        theme: 'light',
                        legacyFlag: true
                    }
                },
                7,
                'device-1'
            ) as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            name: 'Alice',
            settings: {
                theme: 'light'
            }
        });
        expect(migrated.v.legacyFlag).toBeUndefined();
        expect(expectContainer(migrated.v.settings, 'settings').v.legacyFlag).toBeUndefined();
    });

    it('adds root and nested fields', () => {
        const v1Schema = z.object({
            settings: z.object({
                layout: z.string()
            })
        });
        const v2Schema = z.object({
            createdAt: z.number(),
            settings: z.object({
                layout: z.string(),
                theme: z.string()
            })
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.newField([], 'createdAt', 0).newField(['settings'], 'theme', 'light')
        );

        const migrated = projectUp(
            slotFromJson({ settings: { layout: 'compact' } }, 7, 'device-1') as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            createdAt: 0,
            settings: {
                layout: 'compact',
                theme: 'light'
            }
        });
        expect(migrated.v.createdAt).toMatchObject({
            t: 0,
            a: ''
        });
        expect(expectContainer(migrated.v.settings, 'settings').v.theme).toMatchObject({
            t: 0,
            a: ''
        });
    });

    it('updates and converts field values', () => {
        const v1Schema = z.object({
            counter: z.number(),
            age: z.number()
        });
        const v2Schema = z.object({
            counter: z.number(),
            age: z.string()
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.update(['counter'], counter => counter + 1).update(['age'], age => String(age))
        );

        const migrated = projectUp(
            slotFromJson(
                {
                    counter: 4,
                    age: 32
                },
                7,
                'device-1'
            ) as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            counter: 5,
            age: '32'
        });
        expect(migrated.v.counter).toMatchObject({
            t: 7,
            a: 'device-1'
        });
        expect(migrated.v.age).toMatchObject({
            t: 7,
            a: 'device-1'
        });
    });

    it('moves a field into a nested object', () => {
        const v1Schema = z.object({
            a: z.boolean()
        });
        const v2Schema = z.object({
            b: z.object({
                a: z.boolean()
            })
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.newField([], 'b', {}).move(['a'], ['b', 'a'])
        );

        const migrated = projectUp(slotFromJson({ a: true }, 7, 'device-1') as ContainerSlot);

        expect(stripSlot(migrated)).toEqual({
            b: {
                a: true
            }
        });
        expect(migrated.v.a).toBeUndefined();

        const b = expectContainer(migrated.v.b, 'b');
        expect(b).toMatchObject({
            t: 0,
            a: ''
        });
        expect(b.v.a).toMatchObject({
            t: 7,
            a: 'device-1'
        });
    });

    it('moves a nested field up', () => {
        const v1Schema = z.object({
            b: z.object({
                a: z.boolean()
            })
        });
        const v2Schema = z.object({
            a: z.boolean()
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.move(['b', 'a'], ['a']).deleteField([], 'b')
        );

        const migrated = projectUp(
            slotFromJson({ b: { a: true } }, 7, 'device-1') as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            a: true
        });
        expect(migrated.v.b).toBeUndefined();
        expect(migrated.v.a).toMatchObject({
            t: 7,
            a: 'device-1'
        });
    });

    it('patches each ordered array item', () => {
        const itemV1 = zIndexedObject(
            {
                name: z.string()
            },
            value => value.name
        );
        const itemV2 = zIndexedObject(
            {
                title: z.string(),
                enabled: z.boolean()
            },
            value => value.title
        );
        const v1Schema = z.object({
            items: zIndexedArray(itemV1)
        });
        const v2Schema = z.object({
            items: zIndexedArray(itemV2)
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.updateEach(['items'], item =>
                item.rename([], 'name', 'title').newField([], 'enabled', true)
            )
        );

        const migrated = projectUp(
            slotFromJson(
                {
                    items: [
                        itemV1.toJson({
                            name: 'Main'
                        })
                    ]
                },
                7,
                'device-1'
            ) as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            items: [
                {
                    __setId: 'Main',
                    title: 'Main',
                    enabled: true
                }
            ]
        });

        const items = migrated.v.items;
        if (!isOrderedArraySlot(items)) {
            throw new Error('Expected items to be an ordered array');
        }

        const item = expectContainer(items.v.Main, 'item');
        const value = expectContainer(item.v.value, 'item value');
        expect(value.v.title).toMatchObject({
            t: 7,
            a: 'device-1'
        });
        expect(value.v.enabled).toMatchObject({
            t: 0,
            a: ''
        });
    });

    it('patches each record value', () => {
        const v1Schema = z.object({
            users: z.record(
                z.string(),
                z.object({
                    name: z.string(),
                    legacyId: z.string()
                })
            )
        });
        const v2Schema = z.object({
            users: z.record(
                z.string(),
                z.object({
                    name: z.string(),
                    active: z.boolean()
                })
            )
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.updateEach(['users'], user =>
                user.deleteField([], 'legacyId').newField([], 'active', true)
            )
        );

        const migrated = projectUp(
            slotFromJson(
                {
                    users: {
                        alice: {
                            name: 'Alice',
                            legacyId: 'old'
                        }
                    }
                },
                7,
                'device-1'
            ) as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            users: {
                alice: {
                    name: 'Alice',
                    active: true
                }
            }
        });

        const users = expectContainer(migrated.v.users, 'users');
        const alice = expectContainer(users.v.alice, 'alice');
        expect(alice.v.legacyId).toBeUndefined();
        expect(alice.v.active).toMatchObject({
            t: 0,
            a: ''
        });
    });

    it('patches nested collections', () => {
        const derivationV1 = z.object({
            counter: z.number(),
            oldField: z.string()
        });
        const derivationV2 = z.object({
            counter: z.number(),
            newField: z.number()
        });
        const portfolioV1 = zIndexedObject(
            {
                name: z.string(),
                derivations: z.record(z.string(), derivationV1)
            },
            value => value.name
        );
        const portfolioV2 = zIndexedObject(
            {
                name: z.string(),
                derivations: z.record(z.string(), derivationV2)
            },
            value => value.name
        );
        const v1Schema = z.object({
            portfolios: zIndexedArray(portfolioV1)
        });
        const v2Schema = z.object({
            portfolios: zIndexedArray(portfolioV2)
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.updateEach(['portfolios'], portfolio =>
                portfolio.updateEach(['derivations'], derivation =>
                    derivation
                        .newField([], 'newField', 0)
                        .deleteField([], 'oldField')
                        .update(['counter'], counter => counter + 1)
                )
            )
        );

        const migrated = projectUp(
            slotFromJson(
                {
                    portfolios: [
                        portfolioV1.toJson({
                            name: 'Main',
                            derivations: {
                                first: {
                                    counter: 1,
                                    oldField: 'drop'
                                }
                            }
                        })
                    ]
                },
                7,
                'device-1'
            ) as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            portfolios: [
                {
                    __setId: 'Main',
                    name: 'Main',
                    derivations: {
                        first: {
                            counter: 2,
                            newField: 0
                        }
                    }
                }
            ]
        });
    });

    it('patches only one union branch', () => {
        const derivationV1 = z.object({
            chains: z.object({
                btc: z.object({
                    xpub: z.string()
                })
            })
        });
        const derivationV2 = z.object({
            chains: z.object({
                btc: z.object({
                    xpub: z.string(),
                    newField: z.string()
                })
            })
        });
        const bip39V1 = zIndexedObject(
            {
                type: z.literal('BIP39'),
                id: z.string(),
                derivations: z.record(z.string(), derivationV1)
            },
            value => value.id
        );
        const bip39V2 = zIndexedObject(
            {
                type: z.literal('BIP39'),
                id: z.string(),
                derivations: z.record(z.string(), derivationV2)
            },
            value => value.id
        );
        const watchOnly = zIndexedObject(
            {
                type: z.literal('WATCH_ONLY'),
                id: z.string(),
                address: z.string()
            },
            value => value.id
        );
        const v1Schema = z.object({
            portfolios: zIndexedArray(z.discriminatedUnion('type', [bip39V1, watchOnly]))
        });
        const v2Schema = z.object({
            portfolios: zIndexedArray(z.discriminatedUnion('type', [bip39V2, watchOnly]))
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.updateEach(['portfolios'], portfolio =>
                portfolio.when(['type'], 'BIP39', bip39 =>
                    bip39.updateEach(['derivations'], derivation =>
                        derivation.newField(['chains', 'btc'], 'newField', '')
                    )
                )
            )
        );

        const migrated = projectUp(
            slotFromJson(
                {
                    portfolios: [
                        bip39V1.toJson({
                            type: 'BIP39',
                            id: 'main',
                            derivations: {
                                first: {
                                    chains: {
                                        btc: {
                                            xpub: 'xpub'
                                        }
                                    }
                                }
                            }
                        }),
                        watchOnly.toJson({
                            type: 'WATCH_ONLY',
                            id: 'external',
                            address: 'bc1'
                        })
                    ]
                },
                7,
                'device-1'
            ) as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            portfolios: [
                {
                    __setId: 'main',
                    type: 'BIP39',
                    id: 'main',
                    derivations: {
                        first: {
                            chains: {
                                btc: {
                                    xpub: 'xpub',
                                    newField: ''
                                }
                            }
                        }
                    }
                },
                {
                    __setId: 'external',
                    type: 'WATCH_ONLY',
                    id: 'external',
                    address: 'bc1'
                }
            ]
        });
    });

    it('deletes the ordered array items of one union branch on downgrade', () => {
        const bip39 = zIndexedObject(
            {
                type: z.literal('BIP39'),
                id: z.string()
            },
            value => value.id
        );
        const devnet = zIndexedObject(
            {
                type: z.literal('DEVNET'),
                id: z.string(),
                address: z.string()
            },
            value => value.id
        );
        const portfolioV2 = z.discriminatedUnion('type', [bip39, devnet]);
        const v1Schema = z.object({
            portfolios: zIndexedArray(bip39)
        });
        const v2Schema = z.object({
            portfolios: zIndexedArray(portfolioV2)
        });
        type PortfolioV2 = z.infer<typeof portfolioV2>;
        type DevnetV2 = z.infer<typeof devnet>;
        const isDevnet = (
            portfolio: DeepReadonly<PortfolioV2>
        ): portfolio is DeepReadonly<DevnetV2> => portfolio.type === 'DEVNET';

        const projectDown = patch(v2Schema, v1Schema, draft =>
            draft.deleteEach(['portfolios'], isDevnet)
        );

        const source = slotFromJson(
            {
                portfolios: [
                    bip39.toJson({ type: 'BIP39', id: 'main' }),
                    devnet.toJson({ type: 'DEVNET', id: 'dev', address: 'tf1' })
                ]
            },
            7,
            'device-1'
        ) as ContainerSlot;
        const migrated = projectDown(source);

        expect(stripSlot(migrated)).toEqual({
            portfolios: [
                {
                    __setId: 'main',
                    type: 'BIP39',
                    id: 'main'
                }
            ]
        });

        const sourcePortfolios = expectOrderedArray(source.v.portfolios, 'source portfolios');
        const portfolios = expectOrderedArray(migrated.v.portfolios, 'portfolios');
        expect(portfolios.v.dev).toBeUndefined();
        expect(portfolios.v.main).toEqual(sourcePortfolios.v.main);
        expect(portfolios).toMatchObject({ t: 7, a: 'device-1' });
    });

    it('combines multiple operations', () => {
        const accountV1 = zIndexedObject(
            {
                type: z.enum(['BIP39', 'WATCH_ONLY']),
                name: z.string()
            },
            value => value.name
        );
        const accountV2 = zIndexedObject(
            {
                type: z.enum(['BIP39', 'WATCH_ONLY']),
                name: z.string(),
                imported: z.boolean().optional()
            },
            value => value.name
        );
        const v1Schema = z.object({
            portfolios: zIndexedArray(accountV1),
            analyticsId: z.string(),
            legacyState: z.string()
        });
        const v2Schema = z.object({
            accounts: zIndexedArray(accountV2),
            meta: z.object({
                analyticsId: z.string()
            })
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft
                .rename('portfolios', 'accounts')
                .newField('meta', {})
                .move(['analyticsId'], ['meta', 'analyticsId'])
                .deleteField('legacyState')
                .updateEach(['accounts'], account =>
                    account.when(['type'], 'BIP39', bip39 => bip39.newField('imported', false))
                )
        );

        const migrated = projectUp(
            slotFromJson(
                {
                    portfolios: [
                        accountV1.toJson({
                            type: 'BIP39',
                            name: 'Main'
                        }),
                        accountV1.toJson({
                            type: 'WATCH_ONLY',
                            name: 'External'
                        })
                    ],
                    analyticsId: 'analytics-1',
                    legacyState: 'drop'
                },
                7,
                'device-1'
            ) as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            accounts: [
                {
                    __setId: 'Main',
                    type: 'BIP39',
                    name: 'Main',
                    imported: false
                },
                {
                    __setId: 'External',
                    type: 'WATCH_ONLY',
                    name: 'External'
                }
            ],
            meta: {
                analyticsId: 'analytics-1'
            }
        });

        const meta = expectContainer(migrated.v.meta, 'meta');
        expect(meta).toMatchObject({
            t: 0,
            a: ''
        });
        expect(meta.v.analyticsId).toMatchObject({
            t: 7,
            a: 'device-1'
        });
        expect(migrated.v.legacyState).toBeUndefined();
    });

    it('supports root path shorthands in typed patch builders', () => {
        const userV1 = z.object({
            name: z.string(),
            legacyId: z.string()
        });
        const userV2 = z.object({
            displayName: z.string(),
            active: z.boolean()
        });
        const v1Schema = z.record(z.string(), userV1);
        const v2Schema = z.record(z.string(), userV2);

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.updateEach(user =>
                user.rename('name', 'displayName').deleteField('legacyId').newField('active', true)
            )
        );

        const migrated = projectUp(
            slotFromJson(
                {
                    alice: {
                        name: 'Alice',
                        legacyId: 'old'
                    }
                },
                7,
                'device-1'
            ) as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            alice: {
                displayName: 'Alice',
                active: true
            }
        });
    });

    it('supports root update shorthand in typed patch builders', () => {
        const v1Schema = z.object({
            counter: z.number()
        });
        const v2Schema = z.object({
            counter: z.string()
        });

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.update(value => ({
                counter: String(value.counter)
            }))
        );

        const migrated = projectUp(
            slotFromJson(
                {
                    counter: 4
                },
                7,
                'device-1'
            ) as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            counter: '4'
        });
    });

    it('supports root when shorthand in typed patch builders', () => {
        type Bip39 = {
            type: 'BIP39';
            name: string;
        };

        const bip39V1 = z.object({
            type: z.literal('BIP39'),
            name: z.string()
        });
        const watchOnly = z.object({
            type: z.literal('WATCH_ONLY'),
            name: z.string()
        });
        const bip39V2 = z.object({
            type: z.literal('BIP39'),
            name: z.string(),
            imported: z.boolean()
        });
        const v1Schema = z.discriminatedUnion('type', [bip39V1, watchOnly]);
        const v2Schema = z.discriminatedUnion('type', [bip39V2, watchOnly]);

        const projectUp = patch(v1Schema, v2Schema, draft =>
            draft.when(
                (value): value is Readonly<Bip39> => value.type === 'BIP39',
                bip39 => bip39.newField('imported', false)
            )
        );

        const migrated = projectUp(
            slotFromJson(
                {
                    type: 'BIP39',
                    name: 'Main'
                },
                7,
                'device-1'
            ) as ContainerSlot
        );

        expect(stripSlot(migrated)).toEqual({
            type: 'BIP39',
            name: 'Main',
            imported: false
        });
    });
});

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
