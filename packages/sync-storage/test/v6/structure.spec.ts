import { describe, expect, it } from 'vitest';

import {
    createStorageFromSnapshot,
    createStorage,
    defineVersionHList,
    hCons,
    hNil
} from '@safely/slottree';

import { isBip39SPortfolio, syncedStorageVersions } from '../../src';
import { syncedStorageV1 } from '../../src/v1/structure';
import { syncedStorageV2 } from '../../src/v2/structure';
import { syncedStorageV3 } from '../../src/v3/structure';
import { syncedStorageV4 } from '../../src/v4/structure';
import {
    sDerivation as sDerivationV5,
    sLedgerDerivation,
    sPortfolioBip39 as sPortfolioBip39V5,
    sPortfolioLedger
} from '../../src/v5';
import { syncedStorageV5 } from '../../src/v5/structure';

const versionsV5 = defineVersionHList(
    hCons(
        syncedStorageV5,
        hCons(
            syncedStorageV4,
            hCons(syncedStorageV3, hCons(syncedStorageV2, hCons(syncedStorageV1, hNil)))
        )
    )
);

const FLAME = { viewKey: 'testview1example', address: 'tf1example', predicate: 'ab'.repeat(32) };

const deviceV5 = Buffer.from('device-v5');
const deviceV6 = Buffer.from('device-v6');

const meta = { name: 'Portfolio', icon: { type: 'emoji' as const, value: '🙂' } };

const bip39 = sPortfolioBip39V5.toJson({
    type: 'BIP39',
    id: { source: 'IMPORTED', mnemonicHash: 'hash', networkType: 'TESTNET' },
    meta,
    secretRevealedStatus: null,
    encryptedSecret: 'encrypted-mnemonic',
    derivations: [0, 1].map(index =>
        sDerivationV5.toJson({ index, chains: { btc: { xpub: `xpub-${index}` } } })
    )
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

function v5Snapshot(): Buffer {
    const storage = createStorage({ authorId: deviceV5, versions: versionsV5 });
    storage.transaction(draft => {
        draft.at('portfolios').push(bip39);
        draft.at('portfolios').push(ledger);
    });
    return storage.export();
}

describe('synced storage v6', () => {
    it('adds an empty flame chain to every BIP39 derivation and leaves Ledger untouched', () => {
        const storage = createStorageFromSnapshot({
            authorId: deviceV6,
            versions: syncedStorageVersions,
            snapshot: v5Snapshot()
        });

        const [migratedBip39, migratedLedger] = storage.get().portfolios;

        expect(migratedBip39.type).toBe('BIP39');
        expect(
            isBip39SPortfolio(migratedBip39) && migratedBip39.derivations.map(d => d.chains)
        ).toEqual([
            { btc: { xpub: 'xpub-0' }, flame: null },
            { btc: { xpub: 'xpub-1' }, flame: null }
        ]);
        expect(migratedLedger.type === 'LEDGER' && migratedLedger.derivations[0].chains).toEqual({
            btc: { xpub: 'xpub-ledger' }
        });
    });

    it('drops the flame chain when propagating a v6 write down to a v5 device', () => {
        const storage = createStorageFromSnapshot({
            authorId: deviceV6,
            versions: syncedStorageVersions,
            snapshot: v5Snapshot()
        });
        storage.addAuthor(deviceV5, 5);

        storage.transaction(draft => {
            draft.at('portfolios').update(bip39.__setId, portfolioDraft => {
                const bip39Draft = portfolioDraft.narrow(isBip39SPortfolio);
                bip39Draft?.at('derivations').update('0', derivationDraft => {
                    derivationDraft.at('chains').set('flame', FLAME);
                });
                bip39Draft?.set('meta', { ...meta, name: 'Renamed' });
            });
        });

        const [v6Bip39] = storage.get().portfolios;
        expect(isBip39SPortfolio(v6Bip39) && v6Bip39.derivations[0].chains.flame).toEqual(FLAME);

        const v5Storage = createStorageFromSnapshot({
            authorId: deviceV5,
            versions: versionsV5,
            snapshot: storage.export()
        });
        const [v5Bip39] = v5Storage.get().portfolios;

        expect(v5Bip39.meta.name).toBe('Renamed');
        expect(v5Bip39.type === 'BIP39' && v5Bip39.derivations.map(d => d.chains)).toEqual([
            { btc: { xpub: 'xpub-0' } },
            { btc: { xpub: 'xpub-1' } }
        ]);
    });
});
