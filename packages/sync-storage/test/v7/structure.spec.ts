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
import { syncedStorageV5 } from '../../src/v5/structure';
import {
    sDerivation as sDerivationV6,
    sLedgerDerivation,
    sPortfolioBip39 as sPortfolioBip39V6,
    sPortfolioLedger
} from '../../src/v6';
import { syncedStorageV6 } from '../../src/v6/structure';

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

const FLAME = { viewKey: 'testview1example', address: 'tf1example', predicate: 'ab'.repeat(32) };

const deviceV6 = Buffer.from('device-v6');
const deviceV7 = Buffer.from('device-v7');

const meta = { name: 'Portfolio', icon: { type: 'emoji' as const, value: '🙂' } };

const bip39 = sPortfolioBip39V6.toJson({
    type: 'BIP39',
    id: { source: 'IMPORTED', mnemonicHash: 'hash', networkType: 'TESTNET' },
    meta,
    secretRevealedStatus: null,
    encryptedSecret: 'encrypted-mnemonic',
    derivations: [0, 1].map(index =>
        sDerivationV6.toJson({ index, chains: { btc: { xpub: `xpub-${index}` } } })
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

function v6Snapshot(): Buffer {
    const storage = createStorage({ authorId: deviceV6, versions: versionsV6 });
    storage.transaction(draft => {
        draft.at('portfolios').push(bip39);
        draft.at('portfolios').push(ledger);
    });
    return storage.export();
}

describe('synced storage v7', () => {
    it('adds an empty flame chain to every BIP39 derivation and leaves Ledger untouched', () => {
        const storage = createStorageFromSnapshot({
            authorId: deviceV7,
            versions: syncedStorageVersions,
            snapshot: v6Snapshot()
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

    it('drops the flame chain when propagating a v7 write down to a v6 device', () => {
        const storage = createStorageFromSnapshot({
            authorId: deviceV7,
            versions: syncedStorageVersions,
            snapshot: v6Snapshot()
        });
        storage.addAuthor(deviceV6, 6);

        storage.transaction(draft => {
            draft.at('portfolios').update(bip39.__setId, portfolioDraft => {
                const bip39Draft = portfolioDraft.narrow(isBip39SPortfolio);
                bip39Draft?.at('derivations').update('0', derivationDraft => {
                    derivationDraft.at('chains').set('flame', FLAME);
                });
                bip39Draft?.set('meta', { ...meta, name: 'Renamed' });
            });
        });

        const [v7Bip39] = storage.get().portfolios;
        expect(isBip39SPortfolio(v7Bip39) && v7Bip39.derivations[0].chains.flame).toEqual(FLAME);

        const v6Storage = createStorageFromSnapshot({
            authorId: deviceV6,
            versions: versionsV6,
            snapshot: storage.export()
        });
        const [v6Bip39] = v6Storage.get().portfolios;

        expect(v6Bip39.meta.name).toBe('Renamed');
        expect(v6Bip39.type === 'BIP39' && v6Bip39.derivations.map(d => d.chains)).toEqual([
            { btc: { xpub: 'xpub-0' } },
            { btc: { xpub: 'xpub-1' } }
        ]);
    });
});
