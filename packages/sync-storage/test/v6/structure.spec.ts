import { describe, expect, it } from 'vitest';

import { createStorage, defineVersionHList, hCons, hNil } from '@safely/slottree';

import { syncedStorageVersions } from '../../src';
import { syncedStorageV1 } from '../../src/v1/structure';
import { syncedStorageV2 } from '../../src/v2/structure';
import { syncedStorageV3 } from '../../src/v3/structure';
import { syncedStorageV4 } from '../../src/v4/structure';
import { syncedStorageV5 } from '../../src/v5/structure';

const v5OnlyVersions = defineVersionHList(
    hCons(
        syncedStorageV5,
        hCons(
            syncedStorageV4,
            hCons(syncedStorageV3, hCons(syncedStorageV2, hCons(syncedStorageV1, hNil)))
        )
    )
);

const MAC = Buffer.from('mac');
const PHONE = Buffer.from('phone');

function createPair() {
    const desktop = createStorage({ authorId: MAC, versions: syncedStorageVersions });
    const phone = createStorage({ authorId: PHONE, versions: v5OnlyVersions });

    /* the phone learns about the desktop from the merged device list; it cannot name version 6 */
    desktop.addAuthor(PHONE, 5);

    return { desktop, phone };
}

const deviceMeta = <TPlatform extends string>(platform: TPlatform) => ({
    name: `${platform} device`,
    platform,
    osVersion: '1.0',
    appVersion: '1.0.0',
    pairedAt: 1_700_000_000_000
});

describe('synced storage v6', () => {
    it('shows a desktop device to a v5 reader as an ios one', () => {
        const { desktop, phone } = createPair();

        desktop.transaction(draft => {
            draft.set('devicesMeta', { mac: deviceMeta('macos') });
        });
        phone.merge(desktop.export());

        expect(phone.get().devicesMeta?.mac.platform).toBe('ios');
    });

    it('keeps the real platform once the v5 reader writes back', () => {
        const { desktop, phone } = createPair();

        desktop.transaction(draft => {
            draft.set('devicesMeta', { mac: deviceMeta('macos') });
        });
        phone.merge(desktop.export());
        phone.transaction(draft => {
            draft.at('devicesMeta').orDefault({}).entry('phone').orDefault(deviceMeta('ios'));
        });
        desktop.merge(phone.export());

        expect(desktop.get().devicesMeta?.mac.platform).toBe('macos');
        expect(desktop.get().devicesMeta?.phone.platform).toBe('ios');
    });
});
