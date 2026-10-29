import { describe, expect, it } from 'vitest';

import { createStorage, defineVersionHList, hCons, hNil } from '@safely/slottree';

import { syncedStorageVersions } from '../../src';
import { syncedStorageV1 } from '../../src/v1/structure';
import { syncedStorageV2 } from '../../src/v2/structure';
import { syncedStorageV3 } from '../../src/v3/structure';
import { syncedStorageV4 } from '../../src/v4/structure';
import { syncedStorageV5 } from '../../src/v5/structure';
import { sDerivation, sLedgerDerivation, sPortfolioBip39, sPortfolioLedger } from '../../src/v6';
import { syncedStorageV6 } from '../../src/v6/structure';
import { sPortfolioFlameDevnet } from '../../src/v7';

const versionsV6 = defineVersionHList(
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
);

const deviceV6 = Buffer.from('device-v6');
const deviceV7 = Buffer.from('device-v7');

const meta = { name: 'Portfolio', icon: { type: 'emoji' as const, value: '🙂' } };

const bip39 = sPortfolioBip39.toJson({
    type: 'BIP39',
    id: { source: 'IMPORTED', mnemonicHash: 'hash', networkType: 'TESTNET' },
    meta,
    secretRevealedStatus: null,
    encryptedSecret: 'encrypted-mnemonic',
    derivations: [sDerivation.toJson({ index: 0, chains: { btc: { xpub: 'xpub-0' } } })]
});

const ledger = sPortfolioLedger.toJson({
    type: 'LEDGER',
    id: { masterFingerprint: 'f00dbabe', networkType: 'TESTNET' },
    meta,
    deviceModel: 'nanoX',
    derivations: [
        sLedgerDerivation.toJson({
            index: 0,
            meta: { name: 'Account' },
            chains: { btc: { xpub: 'xpub-ledger' } }
        })
    ]
});

const devnet = sPortfolioFlameDevnet.toJson({
    type: 'FLAME_DEVNET',
    id: { mnemonicHash: 'devnet-hash' },
    meta: { ...meta, name: 'Devnet' },
    encryptedSecret: 'encrypted-devnet-mnemonic',
    flame: {
        encryptedViewKey: 'encrypted-view-key',
        receivingAddress: 't1examplei1key',
        trackingAddress: 't1example',
        predicate: 'ab'.repeat(32)
    }
});

function createReplicas() {
    const v6 = createStorage({ authorId: deviceV6, versions: versionsV6 });
    v6.transaction(draft => {
        draft.at('portfolios').push(bip39);
        draft.at('portfolios').push(ledger);
    });

    const v7 = createStorage({ authorId: deviceV7, versions: syncedStorageVersions });
    v7.addAuthor(deviceV6, 6);
    v7.merge(v6.export());

    return { v6, v7 };
}

describe('synced storage v7', () => {
    it('opens v6 portfolios unchanged', () => {
        const { v7 } = createReplicas();

        expect(v7.get().portfolios.map(p => p.type)).toEqual(['BIP39', 'LEDGER']);
        expect(v7.get().portfolios[0]).toEqual(bip39);
    });

    it('hides a devnet portfolio from a v6 device and keeps its edits flowing both ways', () => {
        const { v6, v7 } = createReplicas();

        v7.transaction(draft => {
            draft.at('portfolios').push(devnet);
            draft.at('portfolios').update(bip39.__setId, portfolioDraft => {
                portfolioDraft.set('meta', { ...meta, name: 'Renamed in v7' });
            });
        });
        v6.merge(v7.export());

        expect(v6.get().portfolios.map(p => p.meta.name)).toEqual(['Renamed in v7', 'Portfolio']);

        v6.transaction(draft => {
            draft.at('portfolios').remove(ledger.__setId);
        });
        v7.merge(v6.export());

        expect(v7.get().portfolios.map(p => p.type)).toEqual(['BIP39', 'FLAME_DEVNET']);
        expect(v7.get().portfolios[1]).toEqual(devnet);
    });

    it('keeps a portfolio a v7 device deleted from coming back through a v6 device', () => {
        const { v6, v7 } = createReplicas();

        v7.transaction(draft => {
            draft.at('portfolios').push(devnet);
            draft.at('portfolios').remove(ledger.__setId);
        });
        v6.merge(v7.export());
        v7.merge(v6.export());

        expect(v6.get().portfolios.map(p => p.type)).toEqual(['BIP39']);
        expect(v7.get().portfolios.map(p => p.type)).toEqual(['BIP39', 'FLAME_DEVNET']);
    });

    it('keeps delivering edits of the wallets v6 supports while a devnet wallet exists', () => {
        const { v6, v7 } = createReplicas();
        v7.transaction(draft => {
            draft.at('portfolios').push(devnet);
        });
        v6.merge(v7.export());

        v6.transaction(draft => {
            draft.at('portfolios').update(bip39.__setId, portfolioDraft => {
                portfolioDraft.set('meta', { ...meta, name: 'Renamed in v6' });
            });
        });
        v7.merge(v6.export());
        v7.transaction(draft => {
            draft.at('portfolios').update(bip39.__setId, portfolioDraft => {
                portfolioDraft.set('meta', { ...meta, name: 'Renamed in v7 later' });
            });
            draft.at('portfolios').remove(ledger.__setId);
        });
        v6.merge(v7.export());

        expect(v6.get().portfolios.map(p => p.meta.name)).toEqual(['Renamed in v7 later']);
    });

    it('does not bring a wallet v7 deleted back to a v6 device that joins later', () => {
        const { v6, v7 } = createReplicas();
        const lateDeviceV6 = Buffer.from('device-v6-late');
        v7.transaction(draft => {
            draft.at('portfolios').push(devnet);
            draft.at('portfolios').remove(ledger.__setId);
        });

        const late = createStorage({ authorId: lateDeviceV6, versions: versionsV6 });
        v7.addAuthor(lateDeviceV6, 6);
        v7.transaction(draft => {
            draft.at('portfolios').update(bip39.__setId, portfolioDraft => {
                portfolioDraft.set('meta', { ...meta, name: 'Touched' });
            });
        });
        late.merge(v7.export());
        late.merge(v6.export());
        v7.merge(late.export());

        expect(late.get().portfolios.map(p => p.type)).toEqual(['BIP39']);
        expect(v7.get().portfolios.map(p => p.type)).toEqual(['BIP39', 'FLAME_DEVNET']);
    });

    it('keeps a devnet wallet in v7 when a v6 device reorders its wallets', () => {
        const { v6, v7 } = createReplicas();
        v7.transaction(draft => {
            draft.at('portfolios').push(devnet);
        });
        v6.merge(v7.export());

        v6.transaction(draft => {
            draft.at('portfolios').reorder([ledger.__setId, bip39.__setId]);
        });
        v7.merge(v6.export());

        const types = v7.get().portfolios.map(p => p.type);
        expect(types).toHaveLength(3);
        expect(types.filter(type => type !== 'FLAME_DEVNET')).toEqual(['LEDGER', 'BIP39']);
        expect(types).toContain('FLAME_DEVNET');
    });

    it('brings back a devnet wallet imported again after it was deleted, without showing it to v6', () => {
        const { v6, v7 } = createReplicas();
        v7.transaction(draft => {
            draft.at('portfolios').push(devnet);
        });
        v6.merge(v7.export());
        v7.transaction(draft => {
            draft.at('portfolios').remove(devnet.__setId);
        });
        v6.merge(v7.export());
        v7.transaction(draft => {
            draft.at('portfolios').push(devnet);
        });
        v6.merge(v7.export());
        v7.merge(v6.export());

        expect(v7.get().portfolios.map(p => p.type)).toEqual(['BIP39', 'LEDGER', 'FLAME_DEVNET']);
        expect(v6.get().portfolios.map(p => p.type)).toEqual(['BIP39', 'LEDGER']);
    });
});
