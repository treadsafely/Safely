import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { beforeEach, describe, expect, it } from 'vitest';

import type { SPortfolioBip39, SPortfolioBip39IdImported } from '@safely/sync-storage';
import { sPortfolio } from '@safely/sync-storage';

import type { ILedgerSessionPort, ISecretEncryptor, NoIconPortfolioMeta } from '../src';
import {
    BtcNetwork,
    BtcWalletType,
    InvalidMnemonicError,
    PortfolioBip39,
    PortfolioFactory,
    PortfolioIdBip39Imported,
    PortfolioNetworkType,
    PortfolioType,
    PortfolioWatchOnlyBtc,
    WatchOnlySource
} from '../src';
import { ClosableMnemonicAccessorVault, MockSecretEncryptor } from './utils/mocks';

const ledgerSessionPort: ILedgerSessionPort = {
    withSession: () => {
        throw new Error('Ledger session is not used in this test');
    }
};

const MAINNET_KNOWN_MNEMONIC =
    'teach lecture visa divorce gas teach zone dignity return issue relief cool'.split(' ');
const MAINNET_EXPECTED_ADDRESS = 'bc1q5v68nzc6rjgcl8ug0slpx77ucm4spnwzkwkqy2';
const TESTNET_KNOWN_MNEMONIC =
    'friend north art fix rail decorate nominee oil script physical ordinary panic'.split(' ');
const TESTNET_EXPECTED_ADDRESS = 'tb1q4tvt7x6veyr96kj3deph5av03czytyw5ssalr6';

async function createBip39Portfolio(
    encryptor: ISecretEncryptor,
    accessor: ClosableMnemonicAccessorVault,
    options: {
        network: PortfolioNetworkType;
        meta: NoIconPortfolioMeta;
        seedRevealedFromDevice?: string;
    }
): Promise<PortfolioBip39> {
    const id = await PortfolioIdBip39Imported.create(accessor, options.network);
    const serialized = await PortfolioBip39.createSerializedPortfolio({
        id,
        encryptor,
        mnemonicAccessor: accessor,
        meta: {
            name: options.meta.name,
            icon: options.meta.icon ?? PortfolioIdBip39Imported.getFallbackEmoji(accessor)
        },
        options: {
            seedRevealedFromDevice: options.seedRevealedFromDevice
        }
    });
    return PortfolioFactory.restorePortfolio(serialized, {
        encryptor,
        ledgerSessionPort
    }) as PortfolioBip39;
}

describe('PortfolioBip39 generation', () => {
    let encryptor: MockSecretEncryptor;

    beforeEach(() => {
        encryptor = new MockSecretEncryptor();
    });

    it('derives the expected testnet address for a known mnemonic', async () => {
        const portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC),
            {
                network: PortfolioNetworkType.TESTNET,
                meta: { name: 'Portfolio 1' }
            }
        );

        expect(portfolio.meta.name).toBe('Portfolio 1');
        expect(portfolio.type).toBe(PortfolioType.BIP39);
        expect(portfolio.networkType).toBe(PortfolioNetworkType.TESTNET);
        expect(portfolio.derivations[0].chains.btc.network).toBe(BtcNetwork.TESTNET);
        expect(portfolio.derivations[0].chains.btc.wallets).toHaveLength(1);
        expect(portfolio.derivations[0].chains.btc.wallets[0].address).toBe(
            TESTNET_EXPECTED_ADDRESS
        );
        expect(portfolio.derivations[0].chains.btc.wallets[0].type).toBe(
            BtcWalletType.NATIVE_SEGWIT
        );

        expect(encryptor.decrypt).not.toHaveBeenCalled();
    });

    it('derives the expected mainnet address for a known mnemonic', async () => {
        const portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            {
                network: PortfolioNetworkType.MAINNET,
                meta: { name: 'BTC Mainnet' }
            }
        );

        const wallet = portfolio.derivations[0].chains.btc.wallets[0];
        expect(portfolio.networkType).toBe(PortfolioNetworkType.MAINNET);
        expect(portfolio.derivations[0].chains.btc.network).toBe(BtcNetwork.MAINNET);
        expect(wallet.type).toBe(BtcWalletType.NATIVE_SEGWIT);
        expect(wallet.address).toBe(MAINNET_EXPECTED_ADDRESS);

        expect(encryptor.decrypt).not.toHaveBeenCalled();
    });
});

describe('PortfolioBip39 serialization', () => {
    let encryptor: MockSecretEncryptor;

    beforeEach(() => {
        encryptor = new MockSecretEncryptor();
    });

    it('JSON roundtrip preserves the derived address (no revealed status)', async () => {
        const portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            {
                network: PortfolioNetworkType.MAINNET,
                meta: { name: 'Portfolio 1' }
            }
        );

        expect(portfolio.secretRevealedStatus).toBeNull();

        const json = portfolio.toJSON();
        const parsed = sPortfolio.parse(JSON.parse(JSON.stringify(json))) as SPortfolioBip39;
        const restored = PortfolioFactory.restorePortfolio(parsed, {
            encryptor,
            ledgerSessionPort
        }) as PortfolioBip39;

        expect(restored.derivations[0].chains.btc.wallets[0].address).toBe(
            portfolio.derivations[0].chains.btc.wallets[0].address
        );
        expect(restored.derivations[0].chains.btc.xpub).toBe(
            portfolio.derivations[0].chains.btc.xpub
        );
        expect(restored.meta.name).toBe(portfolio.meta.name);
        expect(restored.secretRevealedStatus).toBeNull();
    });

    it('JSON roundtrip preserves the revealed status', async () => {
        const portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            {
                network: PortfolioNetworkType.MAINNET,
                meta: { name: 'Portfolio 1' },
                seedRevealedFromDevice: 'TEST_DEVICE_NAME'
            }
        );

        expect(portfolio.secretRevealedStatus?.revealedFromDevice).toBe('TEST_DEVICE_NAME');

        const parsed = sPortfolio.parse(JSON.parse(JSON.stringify(portfolio))) as SPortfolioBip39;
        const restored = PortfolioFactory.restorePortfolio(parsed, {
            encryptor,
            ledgerSessionPort
        }) as PortfolioBip39;

        expect(restored.secretRevealedStatus?.revealedFromDevice).toBe('TEST_DEVICE_NAME');
        expect(restored.secretRevealedStatus?.revealedAt.getTime()).toBe(
            portfolio.secretRevealedStatus!.revealedAt.getTime()
        );
        expect(restored.derivations[0].chains.btc.wallets[0].address).toBe(
            portfolio.derivations[0].chains.btc.wallets[0].address
        );
    });
});

describe('PortfolioBip39 identity & determinism', () => {
    let encryptor: MockSecretEncryptor;

    beforeEach(() => {
        encryptor = new MockSecretEncryptor();
    });

    it('same mnemonic + same network → same id (regardless of name)', async () => {
        const p1 = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'A' } }
        );
        const p2 = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'B' } }
        );

        expect((p1.id.toJSON() as SPortfolioBip39IdImported).mnemonicHash).toBe(
            (p2.id.toJSON() as SPortfolioBip39IdImported).mnemonicHash
        );
    });

    it('same mnemonic + same network → same id (mainnet fixture)', async () => {
        const p1 = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'A' } }
        );
        const p2 = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'B' } }
        );

        expect((p1.id.toJSON() as SPortfolioBip39IdImported).mnemonicHash).toBe(
            (p2.id.toJSON() as SPortfolioBip39IdImported).mnemonicHash
        );
    });

    it('same mnemonic + different network → different id', async () => {
        const mainnet = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'M' } }
        );
        const testnet = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.TESTNET, meta: { name: 'T' } }
        );

        expect(mainnet.id.network).toBe(PortfolioNetworkType.MAINNET);
        expect(testnet.id.network).toBe(PortfolioNetworkType.TESTNET);
        expect(mainnet.id.toString()).not.toBe(testnet.id.toString());
        expect(mainnet.derivations[0].chains.btc.network).toBe(BtcNetwork.MAINNET);
        expect(testnet.derivations[0].chains.btc.network).toBe(BtcNetwork.TESTNET);
    });

    it('different mnemonics → different mnemonicHash', async () => {
        const p1 = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'A' } }
        );
        const p2 = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'A' } }
        );

        expect((p1.id.toJSON() as SPortfolioBip39IdImported).mnemonicHash).not.toBe(
            (p2.id.toJSON() as SPortfolioBip39IdImported).mnemonicHash
        );
        expect(p1.id.toString()).not.toBe(p2.id.toString());
    });

    it('same mnemonic + same network → same derived address and xpub', async () => {
        const p1 = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'A' } }
        );
        const p2 = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'A' } }
        );

        expect(p1.derivations[0].chains.btc.wallets[0].address).toBe(
            p2.derivations[0].chains.btc.wallets[0].address
        );
        expect(p1.derivations[0].chains.btc.xpub).toBe(p2.derivations[0].chains.btc.xpub);
        expect(encryptor.decrypt).not.toHaveBeenCalled();
    });

    it('getFallbackEmoji is deterministic for the same mnemonic', () => {
        const icon1 = PortfolioIdBip39Imported.getFallbackEmoji(
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC)
        );
        const icon2 = PortfolioIdBip39Imported.getFallbackEmoji(
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC)
        );

        expect(icon1.type).toBe('emoji');
        expect(icon1).toEqual(icon2);
    });

    it('getFallbackEmoji differs for different mnemonics', () => {
        const icon1 = PortfolioIdBip39Imported.getFallbackEmoji(
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC)
        );
        const icon2 = PortfolioIdBip39Imported.getFallbackEmoji(
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC)
        );

        expect(icon1).not.toEqual(icon2);
    });

    it('respects a user-provided icon over the fallback', async () => {
        const customIcon = { type: 'emoji' as const, value: '🚀' };
        const portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC),
            {
                network: PortfolioNetworkType.MAINNET,
                meta: { name: 'P', icon: customIcon }
            }
        );

        expect(portfolio.meta.icon).toEqual(customIcon);
    });
});

describe('PortfolioBip39 derivations', () => {
    let encryptor: MockSecretEncryptor;

    beforeEach(() => {
        encryptor = new MockSecretEncryptor();
    });

    it('throws when removing the last derivation', async () => {
        const portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(TESTNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.TESTNET, meta: { name: 'P' } }
        );

        expect(() => portfolio.withoutDerivation(0)).toThrow();
        expect(portfolio.derivations).toHaveLength(1);
    });

    it('withAddedNextDerivation adds index=1 with a different address, immutably', async () => {
        const portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'P' } }
        );
        const addr0 = portfolio.derivations[0].chains.btc.wallets[0].address;
        const xpub0 = portfolio.derivations[0].chains.btc.xpub;

        const extended = await portfolio.withAddedNextDerivation();

        expect(extended.derivations.map(d => d.index)).toEqual([0, 1]);
        const addr1 = extended.derivations[1].chains.btc.wallets[0].address;
        const xpub1 = extended.derivations[1].chains.btc.xpub;

        expect(addr1).not.toBe(addr0);
        expect(xpub1).not.toBe(xpub0);
        expect(addr1.startsWith('bc1q')).toBe(true);

        // original portfolio is not mutated
        expect(portfolio.derivations).toHaveLength(1);
    });

    it('withAddedDerivation(N) inserts at the requested index, sorted', async () => {
        const portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'P' } }
        );

        const extended = await portfolio.withAddedDerivation(5);

        expect(extended.derivations.map(d => d.index)).toEqual([0, 5]);
        expect(extended.derivations[1].chains.btc.wallets[0].address.startsWith('bc1q')).toBe(true);
    });

    it('withAddedNextDerivation is deterministic for the same mnemonic', async () => {
        const a = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'A' } }
        );
        const b = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'B' } }
        );
        const aExtended = await a.withAddedNextDerivation();
        const bExtended = await b.withAddedNextDerivation();

        expect(aExtended.derivations[1].chains.btc.wallets[0].address).toBe(
            bExtended.derivations[1].chains.btc.wallets[0].address
        );
    });

    it('withoutDerivation removes a non-last derivation, keeping the rest', async () => {
        const initial = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'P' } }
        );
        const extended = await initial.withAddedNextDerivation();
        const remainingAddress = extended.derivations[1].chains.btc.wallets[0].address;

        const trimmed = extended.withoutDerivation(0);

        expect(trimmed.derivations).toHaveLength(1);
        expect(trimmed.derivations[0].index).toBe(1);
        expect(trimmed.derivations[0].chains.btc.wallets[0].address).toBe(remainingAddress);

        // extended is unchanged
        expect(extended.derivations).toHaveLength(2);
    });

    it('getMnemonic returns the original mnemonic after encrypt/decrypt roundtrip', async () => {
        const portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'P' } }
        );

        expect(encryptor.encrypt).toHaveBeenCalled();
        expect(encryptor.decrypt).not.toHaveBeenCalled();

        const recovered = await portfolio.getMnemonic();

        expect(recovered).toEqual(MAINNET_KNOWN_MNEMONIC);
        expect(encryptor.decrypt).toHaveBeenCalledTimes(1);
    });

    it('restores a stored portfolio with preserved derivation and address', async () => {
        const portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(MAINNET_KNOWN_MNEMONIC),
            { network: PortfolioNetworkType.TESTNET, meta: { name: 'BTC Testnet Portfolio' } }
        );

        const restored = PortfolioFactory.restorePortfolio(sPortfolio.parse(portfolio.toJSON()), {
            encryptor,
            ledgerSessionPort
        }) as PortfolioBip39;

        expect(restored.networkType).toBe(PortfolioNetworkType.TESTNET);
        expect(restored.meta.name).toBe('BTC Testnet Portfolio');
        expect(restored.derivations[0].chains.btc.network).toBe(BtcNetwork.TESTNET);
        expect(restored.derivations[0].chains.btc.wallets[0].address).toBe(
            portfolio.derivations[0].chains.btc.wallets[0].address
        );
        expect(restored.derivations[0].chains.btc.xpub).toBe(
            portfolio.derivations[0].chains.btc.xpub
        );
        expect(encryptor.decrypt).not.toHaveBeenCalled();
    });
});

describe('PortfolioBip39 negative scenarios', () => {
    let encryptor: MockSecretEncryptor;

    beforeEach(() => {
        encryptor = new MockSecretEncryptor();
    });

    async function expectRejection(invalidMnemonic: string[]) {
        await expect(
            createBip39Portfolio(encryptor, new ClosableMnemonicAccessorVault(invalidMnemonic), {
                network: PortfolioNetworkType.MAINNET,
                meta: { name: 'X' }
            })
        ).rejects.toThrow(InvalidMnemonicError);
        expect(encryptor.decrypt).not.toHaveBeenCalled();
    }

    it('rejects mnemonic with non-wordlist symbols', async () => {
        await expectRejection([
            'north!',
            'art@',
            'fix#',
            'rail$',
            'decorate%',
            'nominee^',
            'oil&',
            'script*',
            'physical(',
            'ordinary)',
            'panic_',
            'extra?'
        ]);
    });

    it('rejects 12-word mnemonic with wrong checksum', async () => {
        // last word "lens" → checksum mismatch (valid mnemonic ends with "lend")
        await expectRejection(
            'ivory trouble wheat next depart dove choice easily enroll suffer lawsuit lens'.split(
                ' '
            )
        );
    });

    it('rejects empty mnemonic', async () => {
        await expectRejection([]);
    });

    it('rejects too short mnemonic (5 words)', async () => {
        await expectRejection('apple banana cherry date elder'.split(' '));
    });

    it('rejects too long mnemonic (30 words)', async () => {
        await expectRejection(Array(30).fill('word') as string[]);
    });

    it('rejects mnemonic with duplicate words / bad entropy', async () => {
        await expectRejection(
            'apple apple apple apple apple apple apple apple apple apple apple apple'.split(' ')
        );
    });
});

describe('PortfolioWatchOnlyBtc', () => {
    const ADDRESS = 'bc1qcleg3jtmvlar6cgm24vpq6n8ew3d0hame0av83';
    const TESTNET_ADDRESS = TESTNET_EXPECTED_ADDRESS;
    const META = { name: 'Watch Wallet', icon: { type: 'emoji' as const, value: '👀' } };

    let encryptor: MockSecretEncryptor;

    beforeEach(() => {
        encryptor = new MockSecretEncryptor();
    });

    it('creates a watch-only portfolio from a plain address', () => {
        const portfolio = PortfolioWatchOnlyBtc.create(
            PortfolioWatchOnlyBtc.resolveUserInput(ADDRESS, PortfolioNetworkType.MAINNET),
            META
        );

        expect(portfolio.type).toBe(PortfolioType.WATCH_ONLY);
        expect(portfolio.id.source).toBe(WatchOnlySource.ADDRESS);
        expect(portfolio.wallet.address).toBe(ADDRESS);
        expect(portfolio.wallet.xpub).toBeNull();
    });

    it('JSON roundtrip preserves an address-based watch-only', () => {
        const portfolio = PortfolioWatchOnlyBtc.create(
            PortfolioWatchOnlyBtc.resolveUserInput(ADDRESS, PortfolioNetworkType.MAINNET),
            META
        );

        const restored = PortfolioFactory.restorePortfolio(sPortfolio.parse(portfolio.toJSON()), {
            encryptor,
            ledgerSessionPort
        });

        if (restored.type !== PortfolioType.WATCH_ONLY) {
            throw new Error('expected watch-only');
        }
        expect(restored.wallet.address).toBe(ADDRESS);
        expect(restored.meta.name).toBe(META.name);
    });

    it('produces deterministic ID for the same address', () => {
        const p1 = PortfolioWatchOnlyBtc.create(
            PortfolioWatchOnlyBtc.resolveUserInput(ADDRESS, PortfolioNetworkType.MAINNET),
            META
        );
        const p2 = PortfolioWatchOnlyBtc.create(
            PortfolioWatchOnlyBtc.resolveUserInput(ADDRESS, PortfolioNetworkType.MAINNET),
            META
        );

        expect(p1.id.toString()).toBe(p2.id.toString());
    });

    it('creates and roundtrips a watch-only portfolio from xpub', async () => {
        const mnemonic = generateMnemonic(wordlist, 128).split(' ');
        const bip39Portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(mnemonic),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'BIP39' } }
        );
        const xpub = bip39Portfolio.derivations[0].chains.btc.xpub;

        const portfolio = PortfolioWatchOnlyBtc.create(
            PortfolioWatchOnlyBtc.resolveUserInput(xpub, PortfolioNetworkType.MAINNET),
            META
        );

        expect(portfolio.id.source).toBe(WatchOnlySource.XPUB);
        expect(portfolio.wallet.xpub).toBe(xpub);
        expect(portfolio.wallet.address.startsWith('bc1q')).toBe(true);

        const restored = PortfolioFactory.restorePortfolio(sPortfolio.parse(portfolio.toJSON()), {
            encryptor,
            ledgerSessionPort
        });
        if (restored.type !== PortfolioType.WATCH_ONLY) {
            throw new Error('expected watch-only');
        }
        expect(restored.wallet.xpub).toBe(xpub);
        expect(restored.wallet.address).toBe(portfolio.wallet.address);
    });

    it('deriveAddress previews exactly the address the import creates', async () => {
        const mnemonic = generateMnemonic(wordlist, 128).split(' ');
        const bip39Portfolio = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(mnemonic),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'BIP39' } }
        );
        const xpub = bip39Portfolio.derivations[0].chains.btc.xpub;

        for (const networkType of [PortfolioNetworkType.MAINNET, PortfolioNetworkType.TESTNET]) {
            const portfolio = PortfolioWatchOnlyBtc.create(
                PortfolioWatchOnlyBtc.resolveUserInput(xpub, networkType),
                META
            );

            expect(PortfolioWatchOnlyBtc.deriveAddress(xpub, networkType)).toBe(
                portfolio.wallet.address
            );
        }
    });

    it('creates a TESTNET watch-only from a testnet address', () => {
        const portfolio = PortfolioWatchOnlyBtc.create(
            PortfolioWatchOnlyBtc.resolveUserInput(TESTNET_ADDRESS, PortfolioNetworkType.TESTNET),
            META
        );

        expect(portfolio.networkType).toBe(PortfolioNetworkType.TESTNET);
        expect(portfolio.wallet.network).toBe(BtcNetwork.TESTNET);
        expect(portfolio.wallet.address).toBe(TESTNET_ADDRESS);
        expect(portfolio.id.source).toBe(WatchOnlySource.ADDRESS);
    });

    it('derives a tb1q address when creating an xpub-based watch-only on TESTNET', async () => {
        const mnemonic = generateMnemonic(wordlist, 128).split(' ');
        const bip39 = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(mnemonic),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'BIP39' } }
        );
        const xpub = bip39.derivations[0].chains.btc.xpub;

        const portfolio = PortfolioWatchOnlyBtc.create(
            PortfolioWatchOnlyBtc.resolveUserInput(xpub, PortfolioNetworkType.TESTNET),
            META
        );

        expect(portfolio.networkType).toBe(PortfolioNetworkType.TESTNET);
        expect(portfolio.wallet.network).toBe(BtcNetwork.TESTNET);
        expect(portfolio.wallet.address.startsWith('tb1q')).toBe(true);
        expect(portfolio.wallet.xpub).toBe(xpub);
    });

    it('mainnet and testnet watch-only for the same xpub produce different IDs', async () => {
        const mnemonic = generateMnemonic(wordlist, 128).split(' ');
        const bip39 = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(mnemonic),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'BIP39' } }
        );
        const xpub = bip39.derivations[0].chains.btc.xpub;

        const mainnet = PortfolioWatchOnlyBtc.create(
            PortfolioWatchOnlyBtc.resolveUserInput(xpub, PortfolioNetworkType.MAINNET),
            META
        );
        const testnet = PortfolioWatchOnlyBtc.create(
            PortfolioWatchOnlyBtc.resolveUserInput(xpub, PortfolioNetworkType.TESTNET),
            META
        );

        expect(mainnet.id.toString()).not.toBe(testnet.id.toString());
        expect(mainnet.wallet.address).not.toBe(testnet.wallet.address);
    });

    it('produces different IDs for address-source vs xpub-source of the same wallet', async () => {
        const addressPortfolio = PortfolioWatchOnlyBtc.create(
            PortfolioWatchOnlyBtc.resolveUserInput(ADDRESS, PortfolioNetworkType.MAINNET),
            META
        );
        expect(addressPortfolio.id.source).toBe(WatchOnlySource.ADDRESS);

        const mnemonic = generateMnemonic(wordlist, 128).split(' ');
        const bip39 = await createBip39Portfolio(
            encryptor,
            new ClosableMnemonicAccessorVault(mnemonic),
            { network: PortfolioNetworkType.MAINNET, meta: { name: 'BIP39' } }
        );
        const xpubPortfolio = PortfolioWatchOnlyBtc.create(
            PortfolioWatchOnlyBtc.resolveUserInput(
                bip39.derivations[0].chains.btc.xpub,
                PortfolioNetworkType.MAINNET
            ),
            META
        );

        expect(xpubPortfolio.id.source).toBe(WatchOnlySource.XPUB);
        expect(addressPortfolio.id.toString()).not.toBe(xpubPortfolio.id.toString());
    });
});
