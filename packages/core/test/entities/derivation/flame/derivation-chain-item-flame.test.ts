import { mnemonicToSeed } from '@scure/bip39';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SilentSecretEncryptor } from '@safely/sync';

import type { ILedgerSessionPort, ISeedProducer, SafelyFlame } from '../../../../src';
import {
    DerivationChainItemFlame,
    FLAME_RECEIVING_KEY_PATH,
    FlameNetwork,
    PortfolioFlameDevnet,
    PortfolioFactory,
    PortfolioIdFlameDevnet,
    PortfolioNetworkType
} from '../../../../src';
import { ClosableMnemonicAccessorVault, MockSecureSecretEncryptor } from '../../../utils/mocks';

const ledgerSessionPort: ILedgerSessionPort = {
    withSession: () => {
        throw new Error('Ledger session is not used in this test');
    }
};

const MNEMONIC =
    'friend north art fix rail decorate nominee oil script physical ordinary panic'.split(' ');

const bytes = (fill: number, length = 32) => new Uint8Array(length).fill(fill);

const VIEW_KEY = 'testview1example';

const createViewKeyEncryptor = (fill = 7) =>
    new SilentSecretEncryptor(() => Promise.resolve(Buffer.alloc(32, fill)));

function mockSafelyFlame() {
    const seeds: Uint8Array[] = [];
    const flame = {
        viewKey: vi.fn<SafelyFlame['viewKey']>(seed => {
            seeds.push(new Uint8Array(seed));
            return Promise.resolve(VIEW_KEY);
        }),
        address: vi.fn<SafelyFlame['address']>(() =>
            Promise.resolve({
                receivingAddress: 't1examplei1key',
                trackingAddress: 't1example',
                predicate: bytes(0xab)
            })
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
                                ? {
                                      type: 'clear' as const,
                                      qty: 7n,
                                      flavor: bytes(0xf),
                                      isNative: true
                                  }
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
                        ? {
                              opened: true as const,
                              qty: 5n,
                              flavor: bytes(0xf),
                              isNative: true,
                              memo: bytes(0, 0)
                          }
                        : { opened: false as const, failure: 'missing' as const }
                )
            )
        ),
        buildTransfer: vi.fn<SafelyFlame['buildTransfer']>(seed => {
            seeds.push(new Uint8Array(seed));
            return Promise.resolve({ txid: bytes(0x11), blockTx: bytes(0x22, 4) });
        }),
        replaceProofs: vi.fn<SafelyFlame['replaceProofs']>(blockTx => Promise.resolve(blockTx)),
        validateReceivingAddress: vi.fn<SafelyFlame['validateReceivingAddress']>(() => true),
        memoMaxBytes: vi.fn<SafelyFlame['memoMaxBytes']>(() => 8102)
    };
    return { flame, seeds };
}

async function createSerialized() {
    const encryptor = new MockSecureSecretEncryptor();
    const viewKeyEncryptor = createViewKeyEncryptor();
    const accessor = new ClosableMnemonicAccessorVault(MNEMONIC);
    const serialized = await PortfolioFlameDevnet.createSerializedPortfolio({
        secureSecretEncryptor: encryptor,
        silentSecretEncryptor: viewKeyEncryptor,
        mnemonicAccessor: accessor,
        meta: { name: 'Devnet', icon: { type: 'emoji', value: '🙂' } }
    });
    return { serialized, encryptor, viewKeyEncryptor };
}

async function createPortfolio() {
    const { serialized, encryptor, viewKeyEncryptor } = await createSerialized();
    return PortfolioFactory.restorePortfolio(serialized, {
        secureSecretEncryptor: encryptor,
        silentSecretEncryptor: viewKeyEncryptor,
        ledgerSessionPort
    }) as PortfolioFlameDevnet;
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

    it('stores the encrypted view key of the BIP-39 seed in a new devnet portfolio', async () => {
        const { serialized, viewKeyEncryptor } = await createSerialized();

        const { encryptedViewKey, ...addresses } = serialized.flame;
        expect(addresses).toEqual({
            receivingAddress: 't1examplei1key',
            trackingAddress: 't1example',
            predicate: 'ab'.repeat(32)
        });
        expect(JSON.stringify(serialized)).not.toContain(VIEW_KEY);
        await expect(viewKeyEncryptor.decrypt(encryptedViewKey)).resolves.toBe(VIEW_KEY);
        expect(serialized.id).toEqual(PortfolioIdFlameDevnet.create({ value: MNEMONIC }).toJSON());
        expect(mocked.flame.viewKey).toHaveBeenCalledWith(
            expect.any(Uint8Array),
            FlameNetwork.TESTNET
        );
        expect(mocked.flame.address).toHaveBeenCalledWith(
            VIEW_KEY,
            FlameNetwork.TESTNET,
            FLAME_RECEIVING_KEY_PATH
        );
        expect(mocked.seeds[0]).toEqual(new Uint8Array(await mnemonicToSeed(MNEMONIC.join(' '))));
    });

    it('restores the wallet from the stored address without calling native', async () => {
        const { serialized, encryptor, viewKeyEncryptor } = await createSerialized();
        mocked.flame.address.mockClear();

        const portfolio = PortfolioFlameDevnet.restore(encryptor, viewKeyEncryptor, serialized);
        const [wallet] = portfolio.flame.wallets;

        expect(wallet).toMatchObject({
            network: FlameNetwork.TESTNET,
            receivingAddress: 't1examplei1key',
            trackingAddress: 't1example',
            predicate: 'ab'.repeat(32)
        });
        expect(portfolio.networkType).toBe(PortfolioNetworkType.TESTNET);
        expect(mocked.flame.address).not.toHaveBeenCalled();
        expect(portfolio.toJSON()).toEqual(serialized);
    });

    it('previews the wallet a seed would import, without a vault', async () => {
        const { serialized, encryptor, viewKeyEncryptor } = await createSerialized();
        const [imported] = PortfolioFlameDevnet.restore(encryptor, viewKeyEncryptor, serialized)
            .flame.wallets;

        const preview = await PortfolioFlameDevnet.createPreviewFlameWallet(
            new ClosableMnemonicAccessorVault(MNEMONIC)
        );

        expect(preview.id.isEq(imported.id)).toBe(true);
        expect(preview).toMatchObject({
            network: FlameNetwork.TESTNET,
            receivingAddress: imported.receivingAddress,
            trackingAddress: imported.trackingAddress,
            predicate: imported.predicate
        });
    });

    it('opens confidential notes in the preview with the derived view key', async () => {
        const preview = await PortfolioFlameDevnet.createPreviewFlameWallet(
            new ClosableMnemonicAccessorVault(MNEMONIC)
        );

        const amounts = await preview.readAmounts([
            { id: 'opened', contract: bytes(2), note: bytes(4) }
        ]);

        expect(mocked.flame.openNotes).toHaveBeenCalledWith(
            VIEW_KEY,
            'testnet',
            FLAME_RECEIVING_KEY_PATH,
            expect.any(Array)
        );
        expect(amounts.get('opened')).toMatchObject({ status: 'counted', qty: 5n });
    });

    it('refuses to preview an invalid seed', async () => {
        await expect(
            PortfolioFlameDevnet.createPreviewFlameWallet(
                new ClosableMnemonicAccessorVault(['not', 'a', 'seed'])
            )
        ).rejects.toThrow('Mnemonic is not valid BIP39 mnemonic');
        expect(mocked.flame.viewKey).not.toHaveBeenCalled();
    });

    it('reads clear amounts natively and opens confidential notes with the view key', async () => {
        const [wallet] = (await createPortfolio()).flame.wallets;

        const clearOnly = await wallet.readAmounts([
            { id: 'clear', contract: bytes(1), note: null },
            { id: 'other', contract: bytes(3), note: null }
        ]);

        expect(mocked.flame.openNotes).not.toHaveBeenCalled();
        expect(clearOnly.get('clear')).toEqual({
            status: 'counted',
            qty: 7n,
            flavor: '0f'.repeat(32),
            isNative: true
        });
        expect(clearOnly.get('other')).toEqual({ status: 'notToken' });

        const amounts = await wallet.readAmounts([
            { id: 'clear', contract: bytes(1), note: null },
            { id: 'opened', contract: bytes(2), note: bytes(4) },
            { id: 'missing', contract: bytes(2), note: null }
        ]);

        expect(mocked.flame.openNotes).toHaveBeenCalledWith(
            VIEW_KEY,
            FlameNetwork.TESTNET,
            FLAME_RECEIVING_KEY_PATH,
            expect.any(Array)
        );
        expect(mocked.flame.decodeContracts).toHaveBeenCalledTimes(2);
        expect(amounts.get('opened')).toEqual({
            status: 'counted',
            qty: 5n,
            flavor: '0f'.repeat(32),
            isNative: true
        });
        expect(amounts.get('missing')).toEqual({ status: 'unreadable' });
    });

    it('cannot open confidential notes with another account key', async () => {
        const { serialized, encryptor } = await createSerialized();
        const [wallet] = PortfolioFlameDevnet.restore(
            encryptor,
            createViewKeyEncryptor(8),
            serialized
        ).flame.wallets;

        await expect(
            wallet.readAmounts([{ id: 'opened', contract: bytes(2), note: bytes(4) }])
        ).rejects.toThrow();
        expect(mocked.flame.openNotes).not.toHaveBeenCalled();
    });

    it('does not reopen outputs it has already read', async () => {
        const [wallet] = (await createPortfolio()).flame.wallets;
        const outputs = [{ id: 'opened', contract: bytes(2), note: bytes(4) }];

        await wallet.readAmounts(outputs);
        await wallet.readAmounts(outputs);

        expect(mocked.flame.openNotes).toHaveBeenCalledTimes(1);
    });

    it('rereads an output once a later scan serves the note it lacked', async () => {
        const [wallet] = (await createPortfolio()).flame.wallets;

        const first = await wallet.readAmounts([{ id: 'late', contract: bytes(2), note: null }]);
        const second = await wallet.readAmounts([
            { id: 'late', contract: bytes(2), note: bytes(4) }
        ]);

        expect(first.get('late')).toEqual({ status: 'unreadable' });
        expect(second.get('late')).toEqual({
            status: 'counted',
            qty: 5n,
            flavor: '0f'.repeat(32),
            isNative: true
        });
        expect(mocked.flame.openNotes).toHaveBeenCalledTimes(2);
    });

    it('reopens an output whose note hit a native error', async () => {
        const [wallet] = (await createPortfolio()).flame.wallets;
        const outputs = [{ id: 'retried', contract: bytes(2), note: bytes(4) }];
        mocked.flame.openNotes.mockResolvedValueOnce([
            { opened: false, failure: 'error', reason: 'internal: transient' }
        ]);

        const first = await wallet.readAmounts(outputs);
        const second = await wallet.readAmounts(outputs);

        expect(first.get('retried')).toEqual({ status: 'unreadable' });
        expect(second.get('retried')).toEqual({
            status: 'counted',
            qty: 5n,
            flavor: '0f'.repeat(32),
            isNative: true
        });
    });

    it('flags an output whose note misstates it', async () => {
        const [wallet] = (await createPortfolio()).flame.wallets;
        mocked.flame.openNotes.mockResolvedValueOnce([
            { opened: false, failure: 'openingMismatch' }
        ]);

        const amounts = await wallet.readAmounts([
            { id: 'lying', contract: bytes(2), note: bytes(4) }
        ]);

        expect(amounts.get('lying')).toEqual({ status: 'flagged' });
    });

    it('marks only the failing outputs unreadable when the library rejects some of them', async () => {
        const [wallet] = (await createPortfolio()).flame.wallets;
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
            { opened: true, qty: 5n, flavor: bytes(0xf), isNative: true, memo: bytes(0, 0) }
        ]);

        const amounts = await wallet.readAmounts([
            { id: 'broken', contract: bytes(2), note: bytes(4) },
            { id: 'rejected', contract: bytes(2), note: bytes(4) },
            { id: 'opened', contract: bytes(2), note: bytes(4) }
        ]);

        expect(amounts.get('broken')).toEqual({ status: 'unreadable' });
        expect(amounts.get('rejected')).toEqual({ status: 'unreadable' });
        expect(amounts.get('opened')).toEqual({
            status: 'counted',
            qty: 5n,
            flavor: '0f'.repeat(32),
            isNative: true
        });
    });

    it('reads the memo of an opened note as UTF-8', async () => {
        const [wallet] = (await createPortfolio()).flame.wallets;
        mocked.flame.openNotes.mockResolvedValueOnce([
            {
                opened: true,
                qty: 5n,
                flavor: bytes(0xf),
                isNative: true,
                memo: Uint8Array.from(Buffer.from('за кофе', 'utf8'))
            }
        ]);

        const amounts = await wallet.readAmounts([
            { id: 'opened', contract: bytes(2), note: bytes(4) }
        ]);

        expect(amounts.get('opened')).toEqual({
            status: 'counted',
            qty: 5n,
            flavor: '0f'.repeat(32),
            isNative: true,
            memo: 'за кофе'
        });
    });

    it('decodes a contract again after a failed decode', async () => {
        const [wallet] = (await createPortfolio()).flame.wallets;
        const outputs = [{ id: 'flaky', contract: bytes(1), note: null }];
        mocked.flame.decodeContracts.mockResolvedValueOnce([
            { decoded: false, reason: 'internal: transient' }
        ]);

        const first = await wallet.readAmounts(outputs);
        const second = await wallet.readAmounts(outputs);

        expect(first.get('flaky')).toEqual({ status: 'unreadable' });
        expect(second.get('flaky')).toEqual({
            status: 'counted',
            qty: 7n,
            flavor: '0f'.repeat(32),
            isNative: true
        });
    });

    it('wipes the seed once the view key is derived, even on failure', async () => {
        const seed = Buffer.alloc(64, 9);
        const seedProducer: ISeedProducer = { getSeed: () => Promise.resolve(seed) };
        mocked.flame.viewKey.mockRejectedValueOnce(new Error('native failure'));

        await expect(
            DerivationChainItemFlame.createSChainItem(
                seedProducer,
                FlameNetwork.TESTNET,
                createViewKeyEncryptor()
            )
        ).rejects.toThrow('native failure');

        expect(seed.every(byte => byte === 0)).toBe(true);
    });

    it('builds a transfer with the portfolio seed on the receiving path', async () => {
        const [wallet] = (await createPortfolio()).flame.wallets;
        const request = {
            inputs: [{ contract: bytes(1), note: null, proof: bytes(3) }],
            outputs: [{ address: 'tf1recipient', qty: 5n }],
            fee: 1_000n,
            gas: 1_000_000n
        };

        await expect(wallet.buildTransfer(request)).resolves.toEqual({
            txid: bytes(0x11),
            blockTx: bytes(0x22, 4)
        });

        expect(mocked.flame.buildTransfer).toHaveBeenCalledWith(
            expect.any(Uint8Array),
            FlameNetwork.TESTNET,
            { branch: 0, index: 0 },
            request
        );
        expect(mocked.seeds.at(-1)).toEqual(mocked.seeds[0]);
    });

    it('wipes the seed once the transfer is built, even on failure', async () => {
        const portfolio = await createPortfolio();
        const seed = Buffer.alloc(64, 9);
        const [wallet] = new DerivationChainItemFlame({
            ownerId: portfolio.id,
            network: FlameNetwork.TESTNET,
            sChainItem: portfolio.flame.toJSON(),
            viewKeyEncryptor: createViewKeyEncryptor(),
            seedProducer: { getSeed: () => Promise.resolve(seed) }
        }).wallets;
        mocked.flame.buildTransfer.mockRejectedValueOnce(new Error('native failure'));

        await expect(
            wallet.buildTransfer({ inputs: [], outputs: [], fee: 0n, gas: 0n })
        ).rejects.toThrow('native failure');

        expect(seed.every(byte => byte === 0)).toBe(true);
    });
});
