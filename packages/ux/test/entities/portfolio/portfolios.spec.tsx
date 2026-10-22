/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { act, cleanup } from '@testing-library/react';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILedgerSessionPort, Portfolio, PortfolioMeta } from '@safely/core';
import {
    Id,
    InvalidMnemonicError,
    PortfolioAlreadyExistsError,
    PortfolioBip39,
    PortfolioFactory,
    PortfolioIdBip39Imported,
    PortfolioIdBip39MasterKeyDerived,
    PortfolioMnemonicFactory,
    PortfolioNetworkType,
    PortfolioType,
    PortfolioWatchOnlyBtc
} from '@safely/core';
import type { SPortfolio } from '@safely/sync-storage';

import { ClosableMnemonicAccessorVault, MockSecretEncryptor } from './portfolio-mocks';
import * as accountState from '../../../src/entities/account/account-state';
import { accountKey } from '../../../src/entities/account/keys';
import {
    useAddPortfolio,
    useAddWatchOnlyPortfolio,
    useChangePortfolioMeta,
    useDeletePortfolio,
    useGeneratePortfolio,
    useImportPortfolio,
    useRecordActivePortfolioSecretReveal,
    useReorderPortfolios,
    useSetActivePortfolio
} from '../../../src/entities/portfolio/portfolios';
import { SecretEncryptor } from '../../../src/shared/security/storage';
import type { MockSyncAccount } from '../../harness';
import {
    createMockSyncAccount,
    createTestAppContext,
    createTestQueryClient,
    InMemoryTreeStorage,
    renderHookWithProviders
} from '../../harness';

vi.mock('../../../src/entities/account/account-state', async () => {
    const actual = await vi.importActual<
        typeof import('../../../src/entities/account/account-state')
    >('../../../src/entities/account/account-state');
    return {
        ...actual,
        useActiveAccount: vi.fn(),
        useActiveAccountQuery: vi.fn(),
        useActiveAccountStoreSlot: vi.fn(),
        useAccounts: vi.fn(),
        useActiveAccountQueryKey: vi.fn(),
        useAccountsFactory: vi.fn(),
        useAccountsQueryConfig: vi.fn()
    };
});

const ledgerSessionPort: ILedgerSessionPort = {
    withSession: () => {
        throw new Error('Ledger session is not used in this test');
    }
};

const MAINNET_MNEMONIC =
    'ivory trouble wheat next depart dove choice easily enroll suffer lawsuit lend'.split(' ');
const ANOTHER_MNEMONIC =
    'friend north art fix rail decorate nominee oil script physical ordinary panic'.split(' ');
const MAINNET_ADDRESS = 'bc1qcleg3jtmvlar6cgm24vpq6n8ew3d0hame0av83';

function setupAccountState(opts: { account: MockSyncAccount; portfolios?: Portfolio[] }) {
    (accountState.useActiveAccount as Mock).mockReturnValue(opts.account);
    (accountState.useActiveAccountQuery as Mock).mockReturnValue({
        data: opts.account,
        isLoading: false,
        isError: false
    });
    (accountState.useActiveAccountQueryKey as Mock).mockReturnValue(
        accountKey.accountId(opts.account.accountId)
    );

    const slotMock = accountState.useActiveAccountStoreSlot as Mock;
    slotMock.mockImplementation((key: string) => {
        if (key === 'portfolios') return opts.portfolios ?? [];
        return undefined;
    });

    (accountState.useAccounts as Mock).mockReturnValue([opts.account]);
    (accountState.useAccountsFactory as Mock).mockReturnValue({});
    (accountState.useAccountsQueryConfig as Mock).mockReturnValue({
        queryKey: accountKey.list.toKey(),
        queryFn: async () => [opts.account]
    });
}

async function makeImportedPortfolio(
    mnemonic: string[],
    name = 'Imported'
): Promise<PortfolioBip39> {
    const encryptor = new MockSecretEncryptor();
    const accessor = new ClosableMnemonicAccessorVault(mnemonic);
    const id = await PortfolioIdBip39Imported.create(accessor, PortfolioNetworkType.MAINNET);
    const serialized = await PortfolioBip39.createSerializedPortfolio({
        id,
        encryptor,
        mnemonicAccessor: accessor,
        meta: { name, icon: PortfolioIdBip39Imported.getFallbackEmoji(accessor) }
    });
    return PortfolioFactory.restorePortfolio(serialized, {
        encryptor,
        ledgerSessionPort
    }) as PortfolioBip39;
}

async function makeDerivedPortfolio(
    account: MockSyncAccount,
    storage: InMemoryTreeStorage,
    derivationIndex: number,
    name = 'Derived'
): Promise<PortfolioBip39> {
    const factory = new PortfolioMnemonicFactory(account, storage);
    using accessor = await factory.deriveBip39MnemonicResource(derivationIndex);
    const id = new PortfolioIdBip39MasterKeyDerived({
        derivationIndex,
        networkType: PortfolioNetworkType.MAINNET
    });
    const serialized = await PortfolioBip39.createSerializedPortfolio({
        id,
        encryptor: new SecretEncryptor(account.secretEncryptor, storage),
        mnemonicAccessor: accessor,
        meta: { name, icon: PortfolioIdBip39MasterKeyDerived.getFallbackEmoji(accessor) }
    });
    return PortfolioFactory.restorePortfolio(serialized, {
        encryptor: new SecretEncryptor(account.secretEncryptor, storage),
        ledgerSessionPort
    }) as PortfolioBip39;
}

async function expectedNextDerivingInfo(
    account: MockSyncAccount,
    storage: InMemoryTreeStorage,
    upcomingIndex: number
): Promise<{ index: number; emoji: string }> {
    const factory = new PortfolioMnemonicFactory(account, storage);
    using accessor = await factory.deriveBip39MnemonicResource(upcomingIndex);
    return {
        index: upcomingIndex,
        emoji: PortfolioIdBip39MasterKeyDerived.getFallbackEmoji(accessor).value
    };
}

const ICON: PortfolioMeta['icon'] = { type: 'emoji', value: '🦊' };
const META: PortfolioMeta = { name: 'Test', icon: ICON };

function meta(name: string): PortfolioMeta {
    return { name, icon: ICON };
}

function makeWatchOnly(address: string, name = 'Watch'): PortfolioWatchOnlyBtc {
    return PortfolioWatchOnlyBtc.create(
        PortfolioWatchOnlyBtc.resolveUserInput(address, PortfolioNetworkType.MAINNET),
        meta(name)
    );
}

beforeEach(async () => {
    // Tear down any React tree leftover from a previous test BEFORE we reset
    // mocks; otherwise any pending re-render still references the previous
    // mocked values, which can leave React in a partially-rendered state and
    // make the *next* renderHook return a null `result.current`.
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 0));

    (accountState.useActiveAccount as Mock).mockReset();
    (accountState.useActiveAccountQuery as Mock).mockReset();
    (accountState.useActiveAccountStoreSlot as Mock).mockReset();
    (accountState.useActiveAccountQueryKey as Mock).mockReset();
    (accountState.useAccounts as Mock).mockReset();
    (accountState.useAccountsFactory as Mock).mockReset();
    (accountState.useAccountsQueryConfig as Mock).mockReset();
});

describe('useAddPortfolio (add)', () => {
    it('pushes the provided serialized portfolio into the portfolios slot', async () => {
        const account = createMockSyncAccount();
        setupAccountState({ account });

        const { result } = renderHookWithProviders(() => useAddPortfolio(), {
            appContext: createTestAppContext()
        });

        const portfolio = await makeImportedPortfolio(MAINNET_MNEMONIC);
        const portfolioJson: SPortfolio = portfolio.toJSON();

        await act(async () => {
            await result.current.mutateAsync(portfolioJson);
        });

        expect(account.syncProvider.transaction).toHaveBeenCalledTimes(1);
        const recorder = account.transactions[0];
        const portfoliosSlot = recorder.slots.get('portfolios');
        expect(portfoliosSlot?.push).toHaveBeenCalledTimes(1);
        expect(portfoliosSlot?.push).toHaveBeenCalledWith(portfolioJson);
    });
});

describe('useGeneratePortfolio (add)', () => {
    it('derives, pushes, advances nextDerivingPortfolioInfo from null → index 1 and sets active', async () => {
        const account = createMockSyncAccount({
            initial: { nextDerivingPortfolioInfo: null }
        });
        const secureStorage = new InMemoryTreeStorage(['secure']);

        const generated = await makeDerivedPortfolio(account, secureStorage, 0, META.name);

        setupAccountState({ account, portfolios: [generated] });

        const appContext = createTestAppContext();
        const { result } = renderHookWithProviders(() => useGeneratePortfolio(), {
            appContext
        });

        await act(async () => {
            await result.current.mutateAsync({
                meta: META,
                secureEncryptedStorage: secureStorage
            });
        });

        expect(account.syncProvider.transaction).toHaveBeenCalledTimes(1);
        const recorder = account.transactions[0];

        const portfoliosSlot = recorder.slots.get('portfolios');
        expect(portfoliosSlot?.push).toHaveBeenCalledTimes(1);
        expect((portfoliosSlot?.push.mock.calls[0]?.[0] as SPortfolio).id).toEqual(
            generated.id.toJSON()
        );

        const nextInfoSlot = recorder.slots.get('nextDerivingPortfolioInfo');
        expect(nextInfoSlot?.get).toHaveBeenCalled();
        expect(nextInfoSlot?.set).toHaveBeenCalledWith(
            await expectedNextDerivingInfo(account, secureStorage, 1)
        );

        const activeRaw = await appContext.storage.ux.regular
            .child(['account', account.accountId])
            .getItem('activePortfolio');
        expect(activeRaw).not.toBeNull();
        expect(JSON.parse(activeRaw as string)).toEqual({
            portfolioId: generated.id.toString()
        });
    });

    it('starts at index 1 when nextDerivingPortfolioInfo.index is 1', async () => {
        const account = createMockSyncAccount({
            initial: { nextDerivingPortfolioInfo: { index: 1 } }
        });
        const secureStorage = new InMemoryTreeStorage(['secure']);
        const generated = await makeDerivedPortfolio(account, secureStorage, 1);

        setupAccountState({ account, portfolios: [generated] });

        const { result } = renderHookWithProviders(() => useGeneratePortfolio(), {
            appContext: createTestAppContext()
        });

        await act(async () => {
            await result.current.mutateAsync({
                meta: meta('Two'),
                secureEncryptedStorage: secureStorage
            });
        });

        const recorder = account.transactions[0];
        const nextInfoSlot = recorder.slots.get('nextDerivingPortfolioInfo');
        expect(nextInfoSlot?.set).toHaveBeenCalledWith(
            await expectedNextDerivingInfo(account, secureStorage, 2)
        );
    });

    it('throws and toasts when there is no active account', async () => {
        const account = createMockSyncAccount();
        setupAccountState({ account });
        (accountState.useActiveAccountQuery as Mock).mockReturnValue({ data: null });

        const appContext = createTestAppContext();
        const { result } = renderHookWithProviders(() => useGeneratePortfolio(), {
            appContext
        });

        const secureStorage = new InMemoryTreeStorage(['secure']);

        await expect(
            act(async () => {
                await result.current.mutateAsync({
                    meta: META,
                    secureEncryptedStorage: secureStorage
                });
            })
        ).rejects.toThrow('Cannot generate portfolio without active account');

        expect(account.syncProvider.transaction).not.toHaveBeenCalled();
    });
});

describe('useImportPortfolio (add)', () => {
    it('pushes the new portfolio and then attempts to set it active (orchestration)', async () => {
        // No pre-seeded portfolios → duplicate check passes, push is recorded,
        // and the inner useSetActivePortfolio attempts to look up the just-added
        // portfolio. With our stub portfolios (empty) it will reject; we only
        // verify the *add* part of orchestration here. (set-active is covered
        // by its own dedicated tests below.)
        const account = createMockSyncAccount();
        setupAccountState({ account, portfolios: [] });

        const { result } = renderHookWithProviders(() => useImportPortfolio(), {
            appContext: createTestAppContext()
        });

        const accessor = new ClosableMnemonicAccessorVault(MAINNET_MNEMONIC);
        const secureStorage = new InMemoryTreeStorage(['secure']);
        const encryptor = new SecretEncryptor(account.secretEncryptor, secureStorage);

        let mutationError: unknown;
        await act(async () => {
            try {
                await result.current.mutateAsync({
                    mnemonicAccessor: accessor,
                    secretEncryptor: encryptor,
                    meta: meta('Imported #1'),
                    networkType: PortfolioNetworkType.MAINNET
                });
            } catch (e) {
                mutationError = e;
            }
        });
        expect((mutationError as Error)?.message).toMatch(/Portfolio not found/);
        expect(account.syncProvider.transaction).toHaveBeenCalledTimes(1);
        const recorder = account.transactions[0];
        const portfoliosSlot = recorder.slots.get('portfolios');
        expect(portfoliosSlot?.push).toHaveBeenCalledTimes(1);
    });

    it('throws PortfolioAlreadyExistsError when same mnemonic is already imported', async () => {
        const account = createMockSyncAccount();
        const existing = await makeImportedPortfolio(MAINNET_MNEMONIC);
        setupAccountState({ account, portfolios: [existing] });

        const toastShow = vi.fn();
        const { result } = renderHookWithProviders(() => useImportPortfolio(), {
            appContext: createTestAppContext({ toastShow })
        });

        const accessor = new ClosableMnemonicAccessorVault(MAINNET_MNEMONIC);
        const secureStorage = new InMemoryTreeStorage(['secure']);

        await expect(
            act(async () => {
                await result.current.mutateAsync({
                    mnemonicAccessor: accessor,
                    secretEncryptor: new SecretEncryptor(account.secretEncryptor, secureStorage),
                    meta: meta('Dup'),
                    networkType: PortfolioNetworkType.MAINNET
                });
            })
        ).rejects.toBeInstanceOf(PortfolioAlreadyExistsError);

        expect(account.syncProvider.transaction).not.toHaveBeenCalled();
        // No success toast on duplicate
        expect(toastShow).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    });

    it('shows error toast on invalid mnemonic and does not push', async () => {
        const account = createMockSyncAccount();
        setupAccountState({ account });

        const toastShow = vi.fn();
        const { result } = renderHookWithProviders(() => useImportPortfolio(), {
            appContext: createTestAppContext({ toastShow })
        });

        const invalidMnemonic =
            'apple apple apple apple apple apple apple apple apple apple apple apple'.split(' ');
        const accessor = new ClosableMnemonicAccessorVault(invalidMnemonic);
        const secureStorage = new InMemoryTreeStorage(['secure']);

        let mutationError: unknown;
        await act(async () => {
            try {
                await result.current.mutateAsync({
                    mnemonicAccessor: accessor,
                    secretEncryptor: new SecretEncryptor(account.secretEncryptor, secureStorage),
                    meta: meta('Bad'),
                    networkType: PortfolioNetworkType.MAINNET
                });
            } catch (e) {
                mutationError = e;
            }
        });
        expect(mutationError).toBeInstanceOf(InvalidMnemonicError);

        expect(toastShow).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
        expect(account.syncProvider.transaction).not.toHaveBeenCalled();
    });
});

describe('useAddWatchOnlyPortfolio (add)', () => {
    it('creates watch-only portfolio and orchestrates set-active', async () => {
        const account = createMockSyncAccount();
        setupAccountState({ account, portfolios: [] });

        const { result } = renderHookWithProviders(() => useAddWatchOnlyPortfolio(), {
            appContext: createTestAppContext()
        });

        let mutationError: unknown;
        await act(async () => {
            try {
                await result.current.mutateAsync({
                    input: MAINNET_ADDRESS,
                    meta: meta('Watch')
                });
            } catch (e) {
                mutationError = e;
            }
        });
        expect((mutationError as Error)?.message).toMatch(/Portfolio not found/);

        expect(account.syncProvider.transaction).toHaveBeenCalledTimes(1);
        const recorder = account.transactions[0];
        const pushed = recorder.slots.get('portfolios')?.push.mock.calls[0]?.[0];
        expect((pushed as { type: string }).type).toBe('WATCH_ONLY');
    });

    it('throws PortfolioAlreadyExistsError for a duplicate address', async () => {
        const existing = makeWatchOnly(MAINNET_ADDRESS);
        const account = createMockSyncAccount();
        setupAccountState({ account, portfolios: [existing] });

        const { result } = renderHookWithProviders(() => useAddWatchOnlyPortfolio(), {
            appContext: createTestAppContext()
        });

        await expect(
            act(async () => {
                await result.current.mutateAsync({
                    input: MAINNET_ADDRESS,
                    meta: meta('Dup')
                });
            })
        ).rejects.toBeInstanceOf(PortfolioAlreadyExistsError);

        expect(account.syncProvider.transaction).not.toHaveBeenCalled();
    });
});

describe('useDeletePortfolio (remove)', () => {
    it('calls security.check, removes by id, invalidates activePortfolio query', async () => {
        const portfolio = await makeImportedPortfolio(MAINNET_MNEMONIC);
        const account = createMockSyncAccount();
        setupAccountState({ account, portfolios: [portfolio] });

        const securityCheck = vi.fn(async () => undefined);
        const appContext = createTestAppContext({ securityCheck });

        const { result, queryClient } = renderHookWithProviders(() => useDeletePortfolio(), {
            appContext
        });

        // Seed cache so we can observe invalidation
        queryClient.setQueryData(accountKey.accountId(account.accountId).activePortfolio.toKey(), {
            portfolioId: portfolio.id.toString()
        });

        await act(async () => {
            await result.current.mutateAsync(portfolio);
        });

        expect(securityCheck).toHaveBeenCalledTimes(1);

        const recorder = account.transactions[0];
        expect(recorder.slots.get('portfolios')?.remove).toHaveBeenCalledWith(
            portfolio.jsonArrayId()
        );

        const cached = queryClient.getQueryState(
            accountKey.accountId(account.accountId).activePortfolio.toKey()
        );
        expect(cached?.isInvalidated).toBe(true);
    });

    it('does not call transaction when security check rejects', async () => {
        const portfolio = await makeImportedPortfolio(MAINNET_MNEMONIC);
        const account = createMockSyncAccount();
        setupAccountState({ account, portfolios: [portfolio] });

        const securityCheck = vi.fn(async () => {
            throw new Error('cancelled');
        });
        const { result } = renderHookWithProviders(() => useDeletePortfolio(), {
            appContext: createTestAppContext({ securityCheck })
        });

        await expect(
            act(async () => {
                await result.current.mutateAsync(portfolio);
            })
        ).rejects.toThrow('cancelled');

        expect(account.syncProvider.transaction).not.toHaveBeenCalled();
    });
});

describe('useReorderPortfolios (change)', () => {
    it('forwards a list of jsonArrayIds to draft.reorder', async () => {
        const a = await makeImportedPortfolio(MAINNET_MNEMONIC, 'A');
        const b = await makeImportedPortfolio(ANOTHER_MNEMONIC, 'B');
        const account = createMockSyncAccount();
        setupAccountState({ account, portfolios: [a, b] });

        const { result } = renderHookWithProviders(() => useReorderPortfolios(), {
            appContext: createTestAppContext()
        });

        await act(async () => {
            await result.current.mutateAsync([b, a]);
        });

        const recorder = account.transactions[0];
        expect(recorder.slots.get('portfolios')?.reorder).toHaveBeenCalledWith([
            b.jsonArrayId(),
            a.jsonArrayId()
        ]);
    });
});

describe('useSetActivePortfolio (change)', () => {
    it('writes target id into local storage and invalidates activePortfolio', async () => {
        const a = await makeImportedPortfolio(MAINNET_MNEMONIC, 'A');
        const b = await makeImportedPortfolio(ANOTHER_MNEMONIC, 'B');
        const account = createMockSyncAccount();
        setupAccountState({ account, portfolios: [a, b] });

        const appContext = createTestAppContext();
        const queryClient = createTestQueryClient();
        // Seed initial cache value
        queryClient.setQueryData(accountKey.accountId(account.accountId).activePortfolio.toKey(), {
            portfolioId: a.id.toString()
        });

        const { result } = renderHookWithProviders(() => useSetActivePortfolio(), {
            appContext,
            queryClient
        });

        await act(async () => {
            await result.current.mutateAsync({ id: b.id });
        });

        const activeRaw = await appContext.storage.ux.regular
            .child(['account', account.accountId])
            .getItem('activePortfolio');
        expect(JSON.parse(activeRaw as string)).toEqual({
            portfolioId: b.id.toString()
        });

        const cached = queryClient.getQueryState(
            accountKey.accountId(account.accountId).activePortfolio.toKey()
        );
        expect(cached?.isInvalidated).toBe(true);
    });

    it('throws when no portfolio matches the requested id', async () => {
        const a = await makeImportedPortfolio(MAINNET_MNEMONIC, 'A');
        const account = createMockSyncAccount();
        setupAccountState({ account, portfolios: [a] });

        const { result } = renderHookWithProviders(() => useSetActivePortfolio(), {
            appContext: createTestAppContext()
        });

        const orphan = await PortfolioIdBip39Imported.create(
            new ClosableMnemonicAccessorVault(ANOTHER_MNEMONIC),
            PortfolioNetworkType.MAINNET
        );

        await expect(
            act(async () => {
                await result.current.mutateAsync({ id: orphan });
            })
        ).rejects.toThrow('Portfolio not found');
    });
});

describe('useChangePortfolioMeta (change)', () => {
    it('updates only the changed meta fields via draft.update().at("meta").set(...)', async () => {
        const portfolio = await makeImportedPortfolio(MAINNET_MNEMONIC);
        const account = createMockSyncAccount();
        setupAccountState({ account, portfolios: [portfolio] });

        const { result } = renderHookWithProviders(() => useChangePortfolioMeta(), {
            appContext: createTestAppContext()
        });

        await act(async () => {
            await result.current.mutateAsync({
                portfolio,
                meta: { name: 'Renamed' }
            });
        });

        const recorder = account.transactions[0];
        const portfoliosSlot = recorder.slots.get('portfolios');
        expect(portfoliosSlot?.update).toHaveBeenCalledTimes(1);
        const [arrayId, updater] = portfoliosSlot!.update.mock.calls[0] as [
            unknown,
            (sub: { at: Mock }) => void
        ];
        expect(arrayId).toEqual(portfolio.jsonArrayId());

        // Run the updater against a recording sub-draft to capture pointwise meta writes
        const metaDraft = { set: vi.fn() };
        const sub = { at: vi.fn(() => metaDraft) };
        updater(sub as never);

        expect(sub.at).toHaveBeenCalledWith('meta');
        expect(metaDraft.set).toHaveBeenCalledWith('name', 'Renamed');
        expect(metaDraft.set).not.toHaveBeenCalledWith('icon', expect.anything());
    });
});

describe('useRecordActivePortfolioSecretReveal (change)', () => {
    it('writes secretRevealedStatus on the active bip39 portfolio with current device name', async () => {
        const portfolio = await makeImportedPortfolio(MAINNET_MNEMONIC);
        const account = createMockSyncAccount();
        setupAccountState({ account, portfolios: [portfolio] });

        const appContext = createTestAppContext({ deviceName: 'IPHONE_42' });

        const queryClient = createTestQueryClient();
        // Seed activePortfolio query so useActivePortfolio resolves without suspending
        queryClient.setQueryData(accountKey.accountId(account.accountId).activePortfolio.toKey(), {
            portfolioId: portfolio.id.toString()
        });

        const { result } = renderHookWithProviders(() => useRecordActivePortfolioSecretReveal(), {
            appContext,
            queryClient
        });

        // sanity check — we are setting reveal on a BIP39 portfolio
        expect(portfolio.type).toBe(PortfolioType.BIP39);

        const beforeMs = Date.now();
        await act(async () => {
            await result.current.mutateAsync();
        });

        const recorder = account.transactions[0];
        const portfoliosSlot = recorder.slots.get('portfolios');
        expect(portfoliosSlot?.update).toHaveBeenCalledTimes(1);

        const [arrayId, updater] = portfoliosSlot!.update.mock.calls[0] as [
            unknown,
            (sub: { narrow: Mock }) => void
        ];
        expect(arrayId).toEqual(portfolio.jsonArrayId());

        // Run inner narrow callback
        const setSpy = vi.fn();
        const narrowed = { set: setSpy };
        const sub = {
            narrow: vi.fn(() => narrowed)
        };
        updater(sub as never);

        expect(setSpy).toHaveBeenCalledWith(
            'secretRevealedStatus',
            expect.objectContaining({
                revealedFromDevice: 'IPHONE_42',
                revealedAt: expect.any(Number)
            })
        );
        const callArg = setSpy.mock.calls[0][1] as { revealedAt: number };
        expect(callArg.revealedAt).toBeGreaterThanOrEqual(beforeMs);
    });
});

describe('toPortfolioId interplay', () => {
    it('useSetActivePortfolio looks up by Id.isEq', async () => {
        const portfolio = await makeImportedPortfolio(MAINNET_MNEMONIC);
        const account = createMockSyncAccount();
        setupAccountState({ account, portfolios: [portfolio] });

        const appContext = createTestAppContext();
        const { result } = renderHookWithProviders(() => useSetActivePortfolio(), {
            appContext
        });

        // Build an Id from string — distinct object identity, same toString()
        const idFromString = Id.fromString(portfolio.id.toString()) as typeof portfolio.id;

        await act(async () => {
            await result.current.mutateAsync({ id: idFromString });
        });

        const activeRaw = await appContext.storage.ux.regular
            .child(['account', account.accountId])
            .getItem('activePortfolio');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(JSON.parse(activeRaw as string).portfolioId).toEqual(portfolio.id.toString());
    });
});
