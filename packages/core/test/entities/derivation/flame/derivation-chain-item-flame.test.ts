import { mnemonicToSeed } from '@scure/bip39';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILedgerSessionPort, ISeedProducer, SafelyFlame } from '../../../../src';
import {
    DerivationChainItemFlame,
    FLAME_RECEIVING_KEY_PATH,
    PortfolioBip39,
    PortfolioFactory,
    PortfolioIdBip39Imported,
    PortfolioNetworkType
} from '../../../../src';
import { ClosableMnemonicAccessorVault, MockSecretEncryptor } from '../../../utils/mocks';

const ledgerSessionPort: ILedgerSessionPort = {
    withSession: () => {
        throw new Error('Ledger session is not used in this test');
    }
};

const MNEMONIC =
    'friend north art fix rail decorate nominee oil script physical ordinary panic'.split(' ');

const bytes = (fill: number, length = 32) => new Uint8Array(length).fill(fill);

const VIEW_KEY = 'testview1example';

function mockSafelyFlame() {
    const seeds: Uint8Array[] = [];
    const flame = {
        viewKey: vi.fn<SafelyFlame['viewKey']>(seed => {
            seeds.push(new Uint8Array(seed));
            return Promise.resolve(VIEW_KEY);
        }),
        address: vi.fn<SafelyFlame['address']>(() =>
            Promise.resolve({ address: 'tf1example', predicate: bytes(0xab) })
        ),
        decodeContracts: vi.fn<SafelyFlame['decodeContracts']>(contracts =>
            Promise.resolve(
                contracts.map(contract => ({
                    decoded: true as const,
                    info: {
                        id: bytes(0),
                        predicate: bytes(0xab),
                        value:
                            contract[0] === 1
                                ? { type: 'clear' as const, qty: 7n, flavor: bytes(0xf) }
                                : contract[0] === 2
                                  ? { type: 'confidential' as const }
                                  : { type: 'other' as const }
                    }
                }))
            )
        ),
        openNotes: vi.fn<SafelyFlame['openNotes']>((_viewKey, _network, _path, notes) =>
            Promise.resolve(
                notes.map(({ note }) =>
                    note
                        ? { opened: true as const, qty: 5n, flavor: bytes(0xf), memo: bytes(0, 0) }
                        : { opened: false as const, failure: 'missing' as const }
                )
            )
        )
    };
    return { flame, seeds };
}

async function createSerialized(network: PortfolioNetworkType = PortfolioNetworkType.TESTNET) {
    const encryptor = new MockSecretEncryptor();
    const accessor = new ClosableMnemonicAccessorVault(MNEMONIC);
    const id = await PortfolioIdBip39Imported.create(accessor, network);
    const serialized = await PortfolioBip39.createSerializedPortfolio({
        id,
        encryptor,
        mnemonicAccessor: accessor,
        meta: { name: 'Portfolio', icon: { type: 'emoji', value: '🙂' } }
    });
    return { serialized, encryptor };
}

async function createPortfolio(network: PortfolioNetworkType = PortfolioNetworkType.TESTNET) {
    const { serialized, encryptor } = await createSerialized(network);
    return PortfolioFactory.restorePortfolio(serialized, {
        secureEncryptor: encryptor,
        ledgerSessionPort
    }) as PortfolioBip39;
}

describe('DerivationChainItemFlame', () => {
    let previous: SafelyFlame;
    let mocked: ReturnType<typeof mockSafelyFlame>;

    beforeEach(() => {
        previous = globalThis.flameSdk;
        mocked = mockSafelyFlame();
        globalThis.flameSdk = mocked.flame;
    });

    afterEach(() => {
        globalThis.flameSdk = previous;
    });

    it('stores the view key of the BIP-39 seed in a new testnet portfolio', async () => {
        const { serialized } = await createSerialized();

        expect(serialized.derivations[0].chains.flame).toEqual({
            viewKey: VIEW_KEY,
            address: 'tf1example',
            predicate: 'ab'.repeat(32)
        });
        expect(mocked.flame.viewKey).toHaveBeenCalledWith(expect.any(Uint8Array), 'testnet');
        expect(mocked.flame.address).toHaveBeenCalledWith(
            VIEW_KEY,
            'testnet',
            FLAME_RECEIVING_KEY_PATH
        );
        expect(mocked.seeds[0]).toEqual(new Uint8Array(await mnemonicToSeed(MNEMONIC.join(' '))));
    });

    it('is not created for a mainnet portfolio', async () => {
        const { serialized } = await createSerialized(PortfolioNetworkType.MAINNET);
        const portfolio = await createPortfolio(PortfolioNetworkType.MAINNET);

        expect(serialized.derivations[0].chains.flame).toBeNull();
        expect(portfolio.derivations[0].chains.flame).toBeUndefined();
        expect(mocked.flame.viewKey).not.toHaveBeenCalled();
    });

    it('is not added to a portfolio stored without a view key', async () => {
        const { serialized, encryptor } = await createSerialized();
        const [derivation] = serialized.derivations;
        const existing = {
            ...serialized,
            derivations: [{ ...derivation, chains: { ...derivation.chains, flame: null } }]
        };

        const portfolio = PortfolioBip39.restore(encryptor, existing);

        expect(portfolio.derivations[0].chains.flame).toBeUndefined();
        expect(portfolio.toJSON().derivations[0].chains.flame).toBeNull();
    });

    it('is not added to derivations added later', async () => {
        const portfolio = await createPortfolio();
        const extended = await portfolio.withAddedDerivation(1);

        expect(extended.derivations.map(d => d.chains.flame !== undefined)).toEqual([true, false]);
        expect(extended.toJSON().derivations.map(d => d.chains.flame)).toEqual([
            { viewKey: VIEW_KEY, address: 'tf1example', predicate: 'ab'.repeat(32) },
            null
        ]);
    });

    it('restores the wallet from the stored address without calling native', async () => {
        const { serialized, encryptor } = await createSerialized();
        mocked.flame.address.mockClear();

        const portfolio = PortfolioBip39.restore(encryptor, serialized);
        const chain = portfolio.derivations[0].chains.flame!;

        expect(chain.wallet).toEqual({
            id: chain.id,
            network: 'testnet',
            address: 'tf1example',
            predicate: 'ab'.repeat(32)
        });
        expect(mocked.flame.address).not.toHaveBeenCalled();
        expect(portfolio.toJSON().derivations[0].chains.flame).toEqual(
            serialized.derivations[0].chains.flame
        );
    });

    it('reads clear amounts natively and opens confidential notes with the view key', async () => {
        const chain = (await createPortfolio()).derivations[0].chains.flame!;

        const clearOnly = await chain.readAmounts([
            { id: 'clear', contract: bytes(1), note: null },
            { id: 'other', contract: bytes(3), note: null }
        ]);

        expect(mocked.flame.openNotes).not.toHaveBeenCalled();
        expect(clearOnly.get('clear')).toEqual({
            status: 'counted',
            qty: 7n,
            flavor: '0f'.repeat(32)
        });
        expect(clearOnly.get('other')).toEqual({ status: 'notToken' });

        const amounts = await chain.readAmounts([
            { id: 'clear', contract: bytes(1), note: null },
            { id: 'opened', contract: bytes(2), note: bytes(4) },
            { id: 'missing', contract: bytes(2), note: null }
        ]);

        expect(mocked.flame.openNotes).toHaveBeenCalledWith(
            VIEW_KEY,
            'testnet',
            FLAME_RECEIVING_KEY_PATH,
            expect.any(Array)
        );
        expect(mocked.flame.decodeContracts).toHaveBeenCalledTimes(2);
        expect(amounts.get('opened')).toEqual({
            status: 'counted',
            qty: 5n,
            flavor: '0f'.repeat(32)
        });
        expect(amounts.get('missing')).toEqual({ status: 'unreadable' });
    });

    it('does not reopen outputs it has already read', async () => {
        const chain = (await createPortfolio()).derivations[0].chains.flame!;
        const outputs = [{ id: 'opened', contract: bytes(2), note: bytes(4) }];

        await chain.readAmounts(outputs);
        await chain.readAmounts(outputs);

        expect(mocked.flame.openNotes).toHaveBeenCalledTimes(1);
    });

    it('rereads an output once a later scan serves the note it lacked', async () => {
        const chain = (await createPortfolio()).derivations[0].chains.flame!;

        const first = await chain.readAmounts([{ id: 'late', contract: bytes(2), note: null }]);
        const second = await chain.readAmounts([
            { id: 'late', contract: bytes(2), note: bytes(4) }
        ]);

        expect(first.get('late')).toEqual({ status: 'unreadable' });
        expect(second.get('late')).toEqual({ status: 'counted', qty: 5n, flavor: '0f'.repeat(32) });
        expect(mocked.flame.openNotes).toHaveBeenCalledTimes(2);
    });

    it('reopens an output whose note hit a native error', async () => {
        const chain = (await createPortfolio()).derivations[0].chains.flame!;
        const outputs = [{ id: 'retried', contract: bytes(2), note: bytes(4) }];
        mocked.flame.openNotes.mockResolvedValueOnce([
            { opened: false, failure: 'error', reason: 'internal: transient' }
        ]);

        const first = await chain.readAmounts(outputs);
        const second = await chain.readAmounts(outputs);

        expect(first.get('retried')).toEqual({ status: 'unreadable' });
        expect(second.get('retried')).toEqual({
            status: 'counted',
            qty: 5n,
            flavor: '0f'.repeat(32)
        });
    });

    it('flags an output whose note misstates it', async () => {
        const chain = (await createPortfolio()).derivations[0].chains.flame!;
        mocked.flame.openNotes.mockResolvedValueOnce([
            { opened: false, failure: 'openingMismatch' }
        ]);

        const amounts = await chain.readAmounts([
            { id: 'lying', contract: bytes(2), note: bytes(4) }
        ]);

        expect(amounts.get('lying')).toEqual({ status: 'flagged' });
    });

    it('marks only the failing outputs unreadable when the library rejects some of them', async () => {
        const chain = (await createPortfolio()).derivations[0].chains.flame!;
        mocked.flame.decodeContracts.mockResolvedValueOnce([
            { decoded: false, reason: 'invalidBytes: contract' },
            {
                decoded: true,
                info: { id: bytes(0), predicate: bytes(0xab), value: { type: 'confidential' } }
            },
            {
                decoded: true,
                info: { id: bytes(0), predicate: bytes(0xab), value: { type: 'confidential' } }
            }
        ]);
        mocked.flame.openNotes.mockResolvedValueOnce([
            { opened: false, failure: 'error', reason: 'keyMismatch: input 0' },
            { opened: true, qty: 5n, flavor: bytes(0xf), memo: bytes(0, 0) }
        ]);

        const amounts = await chain.readAmounts([
            { id: 'broken', contract: bytes(2), note: bytes(4) },
            { id: 'rejected', contract: bytes(2), note: bytes(4) },
            { id: 'opened', contract: bytes(2), note: bytes(4) }
        ]);

        expect(amounts.get('broken')).toEqual({ status: 'unreadable' });
        expect(amounts.get('rejected')).toEqual({ status: 'unreadable' });
        expect(amounts.get('opened')).toEqual({
            status: 'counted',
            qty: 5n,
            flavor: '0f'.repeat(32)
        });
    });

    it('decodes a contract again after a failed decode', async () => {
        const chain = (await createPortfolio()).derivations[0].chains.flame!;
        const outputs = [{ id: 'flaky', contract: bytes(1), note: null }];
        mocked.flame.decodeContracts.mockResolvedValueOnce([
            { decoded: false, reason: 'internal: transient' }
        ]);

        const first = await chain.readAmounts(outputs);
        const second = await chain.readAmounts(outputs);

        expect(first.get('flaky')).toEqual({ status: 'unreadable' });
        expect(second.get('flaky')).toEqual({
            status: 'counted',
            qty: 7n,
            flavor: '0f'.repeat(32)
        });
    });

    it('wipes the seed once the view key is derived, even on failure', async () => {
        const seed = Buffer.alloc(64, 9);
        const seedProducer: ISeedProducer = { getSeed: () => Promise.resolve(seed) };
        mocked.flame.viewKey.mockRejectedValueOnce(new Error('native failure'));

        await expect(
            DerivationChainItemFlame.createSChainItem(seedProducer, 'testnet')
        ).rejects.toThrow('native failure');

        expect(seed.every(byte => byte === 0)).toBe(true);
    });
});
