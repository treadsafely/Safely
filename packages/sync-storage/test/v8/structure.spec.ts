import { describe, expect, it } from 'vitest';

import { createStorage, defineVersionHList, hCons, hNil } from '@safely/slottree';

import { syncedStorageVersions } from '../../src';
import { syncedStorageV1 } from '../../src/v1/structure';
import { syncedStorageV2 } from '../../src/v2/structure';
import { syncedStorageV3 } from '../../src/v3/structure';
import { syncedStorageV4 } from '../../src/v4/structure';
import { syncedStorageV5 } from '../../src/v5/structure';
import { syncedStorageV6 } from '../../src/v6/structure';
import { syncedStorageV7 } from '../../src/v7/structure';

const versionsV7 = defineVersionHList(
    hCons(
        syncedStorageV7,
        hCons(
            syncedStorageV6,
            hCons(
                syncedStorageV5,
                hCons(
                    syncedStorageV4,
                    hCons(syncedStorageV3, hCons(syncedStorageV2, hCons(syncedStorageV1, hNil)))
                )
            )
        )
    )
);

const deviceV7 = Buffer.from('device-v7');
const deviceV8 = Buffer.from('device-v8');

function createReplicas() {
    const v7 = createStorage({ authorId: deviceV7, versions: versionsV7 });
    v7.transaction(draft => {
        draft.set('meta', { name: 'Account' });
    });

    const v8 = createStorage({ authorId: deviceV8, versions: syncedStorageVersions });
    v8.addAuthor(deviceV7, 7);
    v8.merge(v7.export());

    return { v7, v8 };
}

describe('synced storage v8', () => {
    it('opens a v7 snapshot with an empty chart slot', () => {
        const { v8 } = createReplicas();

        expect(v8.get().meta?.name).toBe('Account');
        expect(v8.get().chart).toEqual({});
    });

    it('keeps the collapsed flag through a v7 device that cannot see it', () => {
        const { v7, v8 } = createReplicas();

        v8.transaction(draft => {
            draft.at('chart').set('collapsed', true);
        });
        v7.merge(v8.export());

        expect(v7.get()).not.toHaveProperty('chart');

        v7.transaction(draft => {
            draft.set('meta', { name: 'Renamed in v7' });
        });
        v8.merge(v7.export());

        expect(v8.get().meta?.name).toBe('Renamed in v7');
        expect(v8.get().chart.collapsed).toBe(true);
    });

    it('syncs the collapsed flag between two v8 devices', () => {
        const { v8 } = createReplicas();
        const other = createStorage({
            authorId: Buffer.from('device-v8-other'),
            versions: syncedStorageVersions
        });
        other.merge(v8.export());

        v8.transaction(draft => {
            draft.at('chart').set('collapsed', true);
        });
        other.merge(v8.export());
        expect(other.get().chart.collapsed).toBe(true);

        other.transaction(draft => {
            draft.at('chart').set('collapsed', false);
        });
        v8.merge(other.export());
        expect(v8.get().chart.collapsed).toBe(false);
    });
});
