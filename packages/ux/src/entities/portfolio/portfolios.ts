import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type {
    BtcWalletReadOnly,
    SignableBtcWallet,
    IDerivation,
    ILedgerDerivation,
    IMnemonicAccessor,
    Portfolio,
    PortfolioMeta,
    PortfolioWatchOnly,
    ISecretEncryptor,
    ITreeStorage,
    IMnemonicVault
} from '@safely/core';
import { PortfolioWatchOnlyBtc } from '@safely/core';
import { PortfolioLedger } from '@safely/core';
import { PortfolioIdBip39Imported } from '@safely/core';
import { PortfolioBip39, PortfolioIdBip39MasterKeyDerived } from '@safely/core';
import { PortfolioMnemonicFactory } from '@safely/core';
import { assertUnreachable, toPortfolioId } from '@safely/core';
import {
    delay,
    Id,
    PortfolioAlreadyExistsError,
    PortfolioNetworkType,
    PortfolioType
} from '@safely/core';
import {
    isBip39SPortfolio,
    isDerivableSPortfolio,
    isLedgerSPortfolio,
    sLedgerDerivation,
    type SPortfolio
} from '@safely/sync-storage';

import {
    useTranslate,
    useSecurityCheck,
    useAppContext,
    useLogger,
    SecretEncryptor
} from '../../shared';
import { useSuspenseQuery } from '../../shared';
import type { SActivePortfolioSchema, UseAccountSyncStorageUpdateOptions } from '../account';
import { resolveActivePortfolio, useAccountSyncStorageUpdate } from '../account';
import { useActiveAccountSyncStorageSlotUpdate } from '../account';
import { useActiveAccountStoreSlot } from '../account';
import {
    useActiveAccountLocalStorage,
    useActiveAccountQuery,
    useActiveAccountQueryKey
} from '../account';
import { useErrorToast } from '../errors';
import { useReadOnlyCredentialCache } from '../exchange/useReadOnlyCredentialCache';
import { useToast } from '../toast';

const EMPTY_PORTFOLIOS: Portfolio[] = Object.freeze([]) as unknown as Portfolio[];

export function usePortfolios(): Portfolio[] {
    return useActiveAccountStoreSlot('portfolios') ?? EMPTY_PORTFOLIOS;
}

export function useAddPortfolio(options?: UseAccountSyncStorageUpdateOptions) {
    const update = useActiveAccountSyncStorageSlotUpdate('portfolios', options);

    return useMutation<void, Error, SPortfolio>({
        async mutationFn(portfolio) {
            return update(draft => draft.push(portfolio));
        }
    });
}

export function useNewPortfolioFallbackName() {
    const portfolios = usePortfolios();
    const t = useTranslate();

    return t('security.groups.wallet.defaultName', { number: portfolios.length + 1 });
}

export function useGeneratePortfolio() {
    const { mutateAsync: setActivePortfolio } = useSetActivePortfolio();
    const { data: account } = useActiveAccountQuery();
    const update = useAccountSyncStorageUpdate();
    const logger = useLogger('portfolio');

    const errorToast = useErrorToast({
        PortfolioGenerationFailedError: 'importWalletScreen.errors.failedToGenerate'
    });

    return useMutation<
        void,
        Error,
        { meta: PortfolioMeta; secureEncryptedStorage: ITreeStorage },
        unknown
    >({
        async mutationFn(params) {
            logger.info('generating portfolio');
            await delay();

            if (!account) {
                throw new Error('Cannot generate portfolio without active account');
            }

            const portfolioMnemonicFactory = new PortfolioMnemonicFactory(
                account,
                params.secureEncryptedStorage
            );

            const nextWalletIndex =
                account.syncProvider.get('nextDerivingPortfolioInfo')?.index ?? 0;
            using mnemonicAccessor =
                await portfolioMnemonicFactory.deriveBip39MnemonicResource(nextWalletIndex);

            const id = new PortfolioIdBip39MasterKeyDerived({
                derivationIndex: nextWalletIndex,
                networkType: PortfolioNetworkType.MAINNET
            });

            const portfolio = await PortfolioBip39.createSerializedPortfolio({
                mnemonicAccessor,
                encryptor: new SecretEncryptor(
                    account.secretEncryptor,
                    params.secureEncryptedStorage
                ),
                id,
                meta: params.meta
            });

            const upcomingIndex = nextWalletIndex + 1;
            using upcomingMnemonicAccessor =
                await portfolioMnemonicFactory.deriveBip39MnemonicResource(upcomingIndex);
            const upcomingEmoji =
                PortfolioIdBip39MasterKeyDerived.getFallbackEmoji(upcomingMnemonicAccessor).value;

            await update(account, draft => {
                draft.at('portfolios').push(portfolio);

                const nextInfoDraft = draft.at('nextDerivingPortfolioInfo');
                const currentInfo = nextInfoDraft.get();

                if (currentInfo === null || upcomingIndex > currentInfo.index) {
                    nextInfoDraft.set({ index: upcomingIndex, emoji: upcomingEmoji });
                }
            });

            await setActivePortfolio({ id });

            logger.info('portfolio generated', { index: nextWalletIndex });
        },
        onError(error) {
            logger.error('portfolio generation failed', error);
            errorToast(error);
        }
    });
}

export function useImportPortfolio() {
    const { mutateAsync: addPortfolio } = useAddPortfolio({ showErrorToast: false });
    const { mutateAsync: setActivePortfolio } = useSetActivePortfolio();
    const toast = useToast();
    const t = useTranslate();
    const errorToast = useErrorToast({
        InvalidMnemonicError: 'importWalletScreen.errors.invalidMnemonic'
    });
    const { deviceInfo } = useAppContext();
    const portfolioLogger = useLogger('portfolio');
    const portfolios = usePortfolios();

    return useMutation<
        void,
        Error,
        {
            mnemonicAccessor: IMnemonicAccessor & IMnemonicVault;
            secretEncryptor: ISecretEncryptor;
            meta: PortfolioMeta;
            networkType: PortfolioNetworkType;
        },
        unknown
    >({
        async mutationFn({ mnemonicAccessor, secretEncryptor, meta, networkType }) {
            portfolioLogger.info('importing portfolio');
            await delay();

            const id = await PortfolioIdBip39Imported.create(mnemonicAccessor, networkType);

            const portfolio = await PortfolioBip39.createSerializedPortfolio({
                id,
                encryptor: secretEncryptor,
                mnemonicAccessor,
                meta,
                options: {
                    seedRevealedFromDevice: deviceInfo.name
                }
            });

            const existingBip39 = portfolios.find(p => p.id.isEq(id));

            if (existingBip39) {
                throw new PortfolioAlreadyExistsError(existingBip39);
            }

            await addPortfolio(portfolio);

            await setActivePortfolio({ id });

            portfolioLogger.info('portfolio imported', { id: portfolio.id });
        },
        onSuccess() {
            toast(t('importWalletScreen.toastMessages.importedWallet'));
        },
        onError(error) {
            if (error instanceof PortfolioAlreadyExistsError) {
                portfolioLogger.warn('import skipped: portfolio already exists');
                return;
            }

            portfolioLogger.error('portfolio import failed', error);
            errorToast(error);
        }
    });
}

export function useDeletePortfolio() {
    const update = useActiveAccountSyncStorageSlotUpdate('portfolios');
    const credentialCache = useReadOnlyCredentialCache();
    const check = useSecurityCheck();
    const client = useQueryClient();
    const accountQueryKey = useActiveAccountQueryKey();
    const logger = useLogger('portfolio');

    return useMutation<void, Error, Portfolio>({
        async mutationFn(portfolio) {
            logger.info('deleting portfolio', { id: portfolio.id });
            await check();
            await update(draft => draft.remove(portfolio.jsonArrayId()));

            if (portfolio.type === PortfolioType.BIP39) {
                await credentialCache.remove(portfolio.id);
            }

            await client.invalidateQueries({
                queryKey: accountQueryKey.activePortfolio.toKey()
            });

            logger.info('portfolio deleted', { id: portfolio.id });
        }
    });
}

export function useReorderPortfolios() {
    const update = useActiveAccountSyncStorageSlotUpdate('portfolios');

    return useMutation<void, Error, Portfolio[]>({
        async mutationFn(nextPortfoliosOrder) {
            await update(draft => draft.reorder(nextPortfoliosOrder.map(p => p.jsonArrayId())));
        }
    });
}

export function useReorderDerivations() {
    const update = useActiveAccountSyncStorageSlotUpdate('portfolios');

    return useMutation<void, Error, { portfolio: Portfolio; orderedDerivationIds: string[] }>({
        async mutationFn({ portfolio, orderedDerivationIds }) {
            if (portfolio.type === PortfolioType.WATCH_ONLY) return;

            const derivations = portfolio.getDerivations();
            const byId = new Map(derivations.map(d => [d.id.toString(), d]));
            const ordered = orderedDerivationIds
                .map(id => byId.get(id))
                .filter((d): d is IDerivation => d !== undefined);

            if (ordered.length !== derivations.length) return;

            await update(draft =>
                draft.update(portfolio.jsonArrayId(), portfolioDraft => {
                    portfolioDraft
                        .narrow(isDerivableSPortfolio)
                        ?.at('derivations')
                        .reorder(ordered.map(d => String(d.index)));
                })
            );
        }
    });
}

export function useUpdateDerivationMeta() {
    const client = useQueryClient();
    const accountQueryKey = useActiveAccountQueryKey();
    const update = useActiveAccountSyncStorageSlotUpdate('portfolios');

    return useMutation<
        void,
        Error,
        { portfolio: Portfolio; derivationIndex: number; name: string }
    >({
        async mutationFn({ portfolio, derivationIndex, name }) {
            if (portfolio.type !== PortfolioType.LEDGER) return;

            await update(draft =>
                draft.update(portfolio.jsonArrayId(), portfolioDraft => {
                    portfolioDraft
                        .narrow(isLedgerSPortfolio)
                        ?.at('derivations')
                        .update(String(derivationIndex), derivationDraft => {
                            derivationDraft.set('meta', { name });
                        });
                })
            );

            await client.invalidateQueries({
                queryKey: accountQueryKey.activePortfolio.toKey()
            });
        }
    });
}

export function useHideDerivation() {
    const client = useQueryClient();
    const check = useSecurityCheck();
    const accountQueryKey = useActiveAccountQueryKey();
    const update = useActiveAccountSyncStorageSlotUpdate('portfolios');

    return useMutation<void, Error, { portfolio: Portfolio; derivationIndex: number }>({
        async mutationFn({ portfolio, derivationIndex }) {
            if (portfolio.type === PortfolioType.WATCH_ONLY) return;

            await check();

            const remaining = portfolio.getDerivations().filter(d => d.index !== derivationIndex);

            await update(draft => {
                if (remaining.length === 0) {
                    draft.remove(portfolio.jsonArrayId());
                    return;
                }

                draft.update(portfolio.jsonArrayId(), portfolioDraft => {
                    portfolioDraft
                        .narrow(isDerivableSPortfolio)
                        ?.at('derivations')
                        .remove(String(derivationIndex));
                });
            });

            await client.invalidateQueries({
                queryKey: accountQueryKey.activePortfolio.toKey()
            });
        }
    });
}

type ActivePortfolioEntitiesBip39 = {
    type: 'bip39';
    portfolio: PortfolioBip39;
    btcWallet: SignableBtcWallet;
    derivation: IDerivation;
};

type ActivePortfolioEntitiesLedger = {
    type: 'ledger';
    portfolio: PortfolioLedger;
    btcWallet: SignableBtcWallet;
    derivation: ILedgerDerivation;
};

type ActivePortfolioEntitiesWatchOnly = {
    type: 'watch-only';
    portfolio: PortfolioWatchOnly;
};

type ActivePortfolioEntities =
    ActivePortfolioEntitiesBip39 | ActivePortfolioEntitiesLedger | ActivePortfolioEntitiesWatchOnly;

export function isDerivableEntities(
    entities: ActivePortfolioEntities
): entities is ActivePortfolioEntitiesBip39 | ActivePortfolioEntitiesLedger {
    return entities.type !== 'watch-only';
}

export function useActivePortfolioEntitiesIdsQuery<TData = SActivePortfolioSchema>(
    select?: (data: SActivePortfolioSchema) => TData
) {
    const { get, set } = useActiveAccountLocalStorage('activePortfolio');
    const accountQueryKey = useActiveAccountQueryKey();
    const { data: activeAccount } = useActiveAccountQuery();

    return useSuspenseQuery<SActivePortfolioSchema, unknown, TData>({
        queryKey: accountQueryKey.activePortfolio.toKey(),
        async queryFn() {
            if (!activeAccount) return null;

            const stored = await get();
            const next = resolveActivePortfolio(
                stored,
                activeAccount.syncProvider.get('portfolios')
            );

            if (next !== stored) {
                await set(next);
            }

            return next;
        },
        staleTime: Infinity,
        select
    });
}

export function useActivePortfolioEntitiesQuery() {
    const portfolios = usePortfolios();

    return useActivePortfolioEntitiesIdsQuery<ActivePortfolioEntities | null>(
        useCallback(
            (sActivePortfolioSchema: SActivePortfolioSchema) => {
                if (portfolios.length === 0) return null;

                const portfolio =
                    (sActivePortfolioSchema &&
                        portfolios.find(p =>
                            p.id.isEq(Id.fromString(sActivePortfolioSchema.portfolioId))
                        )) ||
                    portfolios[0];

                if (portfolio.type === PortfolioType.WATCH_ONLY) {
                    return { type: 'watch-only' as const, portfolio };
                }

                const derivationIndex = sActivePortfolioSchema?.derivationIndex;

                if (portfolio.type === PortfolioType.LEDGER) {
                    const derivations = portfolio.getDerivations();
                    const derivation =
                        derivations.find(d => d.index === derivationIndex) ?? derivations[0];

                    return {
                        type: 'ledger' as const,
                        portfolio,
                        btcWallet: derivation.chains.btc.wallets[0],
                        derivation
                    };
                }

                const derivations = portfolio.getDerivations();
                const derivation =
                    derivations.find(d => d.index === derivationIndex) ?? derivations[0];

                return {
                    type: 'bip39' as const,
                    portfolio,
                    btcWallet: derivation.chains.btc.wallets[0],
                    derivation
                };
            },
            [portfolios]
        )
    );
}

export function useActivePortfolioEntities(): ActivePortfolioEntities {
    const entities = useActivePortfolioEntitiesQuery().data;
    if (entities === null) {
        throw new Error('No active portfolio');
    }
    return entities;
}

export function useHasPortfolio() {
    return useActivePortfolioEntitiesQuery().data !== null;
}

export function useActiveWalletMeta(): PortfolioMeta {
    const entities = useActivePortfolioEntities();

    if (entities.type === 'ledger') {
        return {
            name: entities.derivation.meta.name,
            icon: entities.portfolio.meta.icon
        };
    }

    return entities.portfolio.meta;
}

export function useIsActivePortfolioWatchOnly(): boolean {
    return useActivePortfolioEntitiesQuery()?.data?.type === 'watch-only';
}

export function useIsActivePortfolioTestnet(): boolean {
    return (
        useActivePortfolioEntitiesQuery()?.data?.portfolio.networkType ===
        PortfolioNetworkType.TESTNET
    );
}

export function useActivePortfolioLedgerIndex(): number | undefined {
    const entities = useActivePortfolioEntitiesQuery()?.data;

    return entities?.type === 'ledger' ? entities.derivation.index : undefined;
}

export function useAddWatchOnlyPortfolio() {
    const { mutateAsync: addPortfolio } = useAddPortfolio();
    const { mutateAsync: setActivePortfolio } = useSetActivePortfolio();
    const portfolios = usePortfolios();
    const logger = useLogger('portfolio');

    return useMutation<Portfolio, Error, { input: string; meta: PortfolioMeta }>({
        async mutationFn({ input, meta }) {
            logger.info('adding watch-only portfolio');
            const id = PortfolioWatchOnlyBtc.resolveUserInput(input, PortfolioNetworkType.MAINNET);

            const portfolio = PortfolioWatchOnlyBtc.create(id, meta);

            const existing = portfolios.find(p => p.id.isEq(portfolio.id));
            if (existing) {
                throw new PortfolioAlreadyExistsError(existing);
            }

            await addPortfolio(portfolio.toJSON());
            await setActivePortfolio(portfolio);

            logger.info('watch-only portfolio added', { id: portfolio.id });

            return portfolio;
        }
    });
}

export function useAddLedgerPortfolio() {
    const t = useTranslate();
    const portfolios = usePortfolios();
    const { mutateAsync: addPortfolio } = useAddPortfolio();
    const { mutateAsync: setActivePortfolio } = useSetActivePortfolio();

    return useMutation<
        void,
        Error,
        {
            masterFingerprint: Buffer;
            deviceModel: string;
            accounts: { index: number; xpub: string }[];
            meta: PortfolioMeta;
        }
    >({
        async mutationFn({ masterFingerprint, deviceModel, accounts, meta }) {
            const serialized = PortfolioLedger.createSerializedPortfolio({
                masterFingerprint,
                networkType: PortfolioNetworkType.MAINNET,
                deviceModel,
                accounts: accounts.map(account => ({
                    ...account,
                    name: t('portfolio.ledgerWallet', { number: account.index + 1 })
                })),
                meta
            });

            const id = toPortfolioId(serialized);

            const existing = portfolios.find(p => p.id.isEq(id));
            if (existing) {
                throw new PortfolioAlreadyExistsError(existing);
            }

            await addPortfolio(serialized);
            await setActivePortfolio({ id });
        }
    });
}

export function useUpdateLedgerDerivations() {
    const t = useTranslate();
    const client = useQueryClient();
    const accountQueryKey = useActiveAccountQueryKey();
    const update = useActiveAccountSyncStorageSlotUpdate('portfolios');

    return useMutation<
        void,
        Error,
        {
            portfolio: PortfolioLedger;
            accounts: { index: number; xpub: string }[];
            meta?: PortfolioMeta;
        }
    >({
        async mutationFn({ portfolio, accounts, meta }) {
            const selectedIndexes = new Set(accounts.map(account => account.index));
            const existingIndexes = new Set(portfolio.getDerivations().map(d => d.index));

            const newAccounts = accounts
                .filter(account => !existingIndexes.has(account.index))
                .sort((a, b) => a.index - b.index);
            const removedIndexes = [...existingIndexes].filter(
                index => !selectedIndexes.has(index)
            );

            await update(draft =>
                draft.update(portfolio.jsonArrayId(), portfolioDraft => {
                    const ledgerDraft = portfolioDraft.narrow(isLedgerSPortfolio);

                    if (!ledgerDraft) return;

                    const derivationsDraft = ledgerDraft.at('derivations');

                    for (const index of removedIndexes) {
                        derivationsDraft.remove(String(index));
                    }

                    for (const account of newAccounts) {
                        derivationsDraft.push(
                            sLedgerDerivation.toJson({
                                index: account.index,
                                meta: {
                                    name: t('portfolio.ledgerWallet', { number: account.index + 1 })
                                },
                                chains: { btc: { xpub: account.xpub } }
                            })
                        );
                    }

                    if (meta) {
                        ledgerDraft.set('meta', meta);
                    }
                })
            );

            await client.invalidateQueries({
                queryKey: accountQueryKey.activePortfolio.toKey()
            });
        }
    });
}

export function useSetActivePortfolio() {
    const { set } = useActiveAccountLocalStorage('activePortfolio');
    const client = useQueryClient();
    const accountQueryKey = useActiveAccountQueryKey();
    const portfolios = usePortfolios();
    const logger = useLogger('portfolio');

    return useMutation<Portfolio, Error, { id: Portfolio['id']; derivationIndex?: number }>({
        async mutationFn({ id, derivationIndex }) {
            logger.info('start set active portfolio', {
                id
            });
            const portfolioToSet = portfolios.find(a => a.id.isEq(id));

            if (!portfolioToSet) {
                throw new Error('Portfolio not found');
            }

            await set({
                portfolioId: portfolioToSet.id.toString(),
                derivationIndex
            });

            await client.invalidateQueries({
                queryKey: accountQueryKey.activePortfolio.toKey()
            });

            logger.info('set active portfolio complete', {
                id: portfolioToSet.id
            });
            return portfolioToSet;
        }
    });
}

export function useChangePortfolioMeta() {
    const update = useActiveAccountSyncStorageSlotUpdate('portfolios');

    return useMutation<void, Error, { portfolio: Portfolio; meta: Partial<PortfolioMeta> }>({
        mutationFn({ portfolio, meta }) {
            return update(draft =>
                draft.update(portfolio.jsonArrayId(), activePortfolioDraft => {
                    const metaDraft = activePortfolioDraft.at('meta');

                    if (meta.name !== undefined) {
                        metaDraft.set('name', meta.name);
                    }

                    if (meta.icon !== undefined) {
                        metaDraft.set('icon', meta.icon);
                    }
                })
            );
        }
    });
}

export function useRecordActivePortfolioSecretReveal() {
    const activePortfolio = useActivePortfolio();
    const update = useActiveAccountSyncStorageSlotUpdate('portfolios');
    const { deviceInfo } = useAppContext();
    const logger = useLogger('portfolio');

    return useMutation({
        mutationFn() {
            logger.info('recording portfolio secret reveal');
            return update(draft =>
                draft.update(activePortfolio.jsonArrayId(), activePortfolioDraft => {
                    const bip39Draft = activePortfolioDraft.narrow(isBip39SPortfolio);

                    bip39Draft?.set('secretRevealedStatus', {
                        revealedAt: new Date().getTime(),
                        revealedFromDevice: deviceInfo.name
                    });
                })
            );
        }
    });
}

export function useActivePortfolio() {
    return useActivePortfolioEntities().portfolio;
}

export function useActiveBtcWallet(): BtcWalletReadOnly {
    const entities = useActivePortfolioEntities();

    if (entities.type === 'watch-only') {
        return entities.portfolio.wallet;
    }

    return entities.btcWallet;
}

export function useActiveSignableBtcWallet(): SignableBtcWallet {
    const entities = useActivePortfolioEntities();

    if (!isDerivableEntities(entities)) {
        throw new Error('Signable wallet unavailable for watch-only portfolio');
    }

    return entities.btcWallet;
}

export function findPortfolioMetaByAddress(
    portfolios: Portfolio[],
    address: string
): PortfolioMeta | undefined {
    for (const portfolio of portfolios) {
        if (portfolio.type === PortfolioType.LEDGER) {
            const derivation = portfolio.derivations.find(
                d => d.chains.btc.wallets[0]?.address === address
            );
            if (derivation) {
                return { name: derivation.meta.name, icon: portfolio.meta.icon };
            }

            continue;
        }

        if (resolveBtcWallet(portfolio).address === address) {
            return portfolio.meta;
        }
    }

    return undefined;
}

export function resolveBtcWallet(portfolio: Portfolio): BtcWalletReadOnly {
    if (portfolio.type === PortfolioType.WATCH_ONLY) {
        return portfolio.wallet;
    }

    return portfolio.derivations[0].chains.btc.wallets[0];
}

export function isDerivablePortfolio(
    portfolio: Portfolio
): portfolio is PortfolioBip39 | PortfolioLedger {
    switch (portfolio.type) {
        case PortfolioType.BIP39:
        case PortfolioType.LEDGER:
            return true;
        case PortfolioType.WATCH_ONLY:
            return false;
        default:
            return assertUnreachable(portfolio);
    }
}

export function resolveBtcWallets(
    portfolio: PortfolioBip39 | PortfolioLedger
): BtcWalletReadOnly[] {
    switch (portfolio.type) {
        case PortfolioType.LEDGER:
            return portfolio.derivations.map(d => d.chains.btc.wallets[0]!);
        case PortfolioType.BIP39:
            return [resolveBtcWallet(portfolio)];
        default:
            return assertUnreachable(portfolio);
    }
}

export function getPortfolioDisplayName(meta: PortfolioMeta): string {
    if (meta.icon.type === 'emoji') {
        return `${meta.icon.value} ${meta.name}`;
    }

    return meta.name;
}
