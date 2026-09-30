import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import type { IMnemonicAccessor, IMnemonicVault, ITreeStorage } from '@safely/core';
import { deriveAnalyticsAccountUuid, MnemonicResource } from '@safely/core';
import {
    PortfolioBip39,
    PortfolioIdBip39Imported,
    PortfolioIdBip39MasterKeyDerived,
    PortfolioIdLedger,
    PortfolioLedger,
    PortfolioWatchOnlyBtc,
    toPortfolioIdWatchOnly
} from '@safely/core';
import { PortfolioMnemonicFactory } from '@safely/core';
import { toPortfolioId } from '@safely/core';
import { assertUnreachable, delay, PortfolioNetworkType } from '@safely/core';
import type {
    ISyncAccount,
    Logger,
    OnboardingConnector as RawOnboardingConnector
} from '@safely/sync';
import { OnboardingAbortedError, SyncStatus, waitForChange } from '@safely/sync';
import type {
    SNextDerivingPortfolioInfo,
    SPortfolio,
    SyncedStorageStructure
} from '@safely/sync-storage';

import type {
    AccountMeta,
    OnboardedAccount,
    OnboardingConnector,
    SyncAccount
} from './account-state';
import { useAccountsQueryConfig } from './account-state';
import { useActiveAccountMeta } from './account-state';
import { useAccounts } from './account-state';
import { useAccountsFactory, useActiveAccount } from './account-state';
import { accountKey } from './keys';
import type { SActivePortfolioSchema } from './local-storage';
import { useClearActiveAccountLocalStorage } from './local-storage';
import { accountStore } from './sync-storage/account-store';
import {
    SecretEncryptor,
    useAppContext,
    useLogger,
    useSharedUxStorage,
    useTranslate
} from '../../shared';
import { useErrorToast } from '../errors';
import { useLoader } from '../loader';
import {
    useCurrentDeviceIkPub,
    useGenerateOwnSyncedDeviceMeta,
    useSetOwnSyncedDeviceMeta
} from '../synced-device';
import { useToast } from '../toast';
import {
    useAccountSyncStorageUpdate,
    useActiveAccountSyncStorageSlotUpdate,
    useActiveAccountSyncStorageUpdate
} from './useAccountSyncStorageUpdate';

export * from './local-storage';
export * from './sync-storage';

export function useNewAccountDefaultName() {
    const accounts = useAccounts();
    const accountsLength = accounts.length ?? 0;
    const t = useTranslate();

    return useMemo(
        () => t('addAccount.defaultName', { number: accountsLength + 1 }),
        [t, accounts]
    );
}

export type AccountPortfolioSource =
    | { kind: 'generated' }
    | {
          kind: 'imported';
          mnemonicAccessor: IMnemonicAccessor & IMnemonicVault;
          networkType: PortfolioNetworkType;
      }
    | { kind: 'watchOnly'; input: string; networkType: PortfolioNetworkType }
    | {
          kind: 'ledger';
          masterFingerprint: string;
          deviceModel: string;
          walletName: string;
          accounts: { index: number; xpub: string; name: string }[];
      };

async function buildFirstPortfolio(params: {
    account: ISyncAccount<SyncedStorageStructure>;
    secureEncryptedStorage: ITreeStorage;
    source: AccountPortfolioSource;
    portfolioName: string;
    deviceName: string;
    logger: Logger;
}): Promise<{ portfolio: SPortfolio; nextDerivingInfo: SNextDerivingPortfolioInfo }> {
    const { account, secureEncryptedStorage, source, portfolioName, deviceName, logger } = params;

    const portfolioMnemonicFactory = new PortfolioMnemonicFactory(account, secureEncryptedStorage);

    let portfolio: SPortfolio;

    switch (source.kind) {
        case 'watchOnly': {
            const id = PortfolioWatchOnlyBtc.resolveUserInput(source.input, source.networkType);
            portfolio = PortfolioWatchOnlyBtc.create(id, {
                name: portfolioName,
                icon: toPortfolioIdWatchOnly(id).getFallbackEmoji()
            }).toJSON();
            break;
        }
        case 'imported': {
            const encryptor = new SecretEncryptor(account.secretEncryptor, secureEncryptedStorage);
            const id = await PortfolioIdBip39Imported.create(
                source.mnemonicAccessor,
                source.networkType
            );

            const mnemonic = await source.mnemonicAccessor.getMnemonic();
            using accessor = new MnemonicResource(mnemonic);

            const defaultIcon = PortfolioIdBip39Imported.getFallbackEmoji(accessor);
            using mnemonicAccessor = new MnemonicResource(mnemonic);

            portfolio = await PortfolioBip39.createSerializedPortfolio({
                id,
                mnemonicAccessor: mnemonicAccessor,
                encryptor,
                meta: {
                    name: portfolioName,
                    icon: defaultIcon
                },
                options: { seedRevealedFromDevice: deviceName },
                logger
            });
            break;
        }
        case 'ledger': {
            const id = new PortfolioIdLedger({
                masterFingerprint: source.masterFingerprint,
                networkType: PortfolioNetworkType.MAINNET
            });
            portfolio = PortfolioLedger.createSerializedPortfolio({
                masterFingerprint: Buffer.from(source.masterFingerprint, 'hex'),
                networkType: PortfolioNetworkType.MAINNET,
                deviceModel: source.deviceModel,
                accounts: source.accounts,
                meta: { name: source.walletName, icon: id.getFallbackEmoji() }
            });
            break;
        }
        case 'generated': {
            const encryptor = new SecretEncryptor(account.secretEncryptor, secureEncryptedStorage);
            using mnemonicAccessor = await portfolioMnemonicFactory.deriveBip39MnemonicResource(0);
            const id = new PortfolioIdBip39MasterKeyDerived({
                derivationIndex: 0,
                networkType: PortfolioNetworkType.MAINNET
            });
            portfolio = await PortfolioBip39.createSerializedPortfolio({
                id,
                mnemonicAccessor,
                encryptor,
                meta: {
                    name: portfolioName,
                    icon: PortfolioIdBip39MasterKeyDerived.getFallbackEmoji(mnemonicAccessor)
                },
                logger
            });
            break;
        }
        default:
            assertUnreachable(source);
    }

    const nextIndex = source.kind === 'generated' ? 1 : 0;
    using nextMnemonicAccessor =
        await portfolioMnemonicFactory.deriveBip39MnemonicResource(nextIndex);
    const nextDerivingInfo: SNextDerivingPortfolioInfo = {
        index: nextIndex,
        emoji: PortfolioIdBip39MasterKeyDerived.getFallbackEmoji(nextMnemonicAccessor).value
    };

    return { portfolio, nextDerivingInfo };
}

async function archiveOwnDevices(accounts: SyncAccount[], logger: Logger): Promise<void> {
    const synced = accounts.filter(
        account => account.syncProvider.syncStatusManager.getStatus() !== SyncStatus.OFFLINE
    );

    const archiving = synced.map(async account => {
        const ikPubHex = account.getMyDeviceIkPub().toString('hex');

        await account.syncProvider.transaction(draft => {
            draft
                .at('devicesArchive')
                .entry(ikPubHex)
                .set({ archivedAt: Date.now(), archivedFromIkPubHex: null });
        });

        await account.syncProvider.syncStatusManager.waitForStatus(SyncStatus.SYNCHRONIZED, {
            timeout: ARCHIVE_ON_ERASE_TIMEOUT_MS
        });
    });

    const results = await Promise.allSettled(archiving);
    const failed = results.filter(result => result.status === 'rejected').length;

    if (failed > 0) {
        logger.warn('erase_all_data.archive_failed', { failed, total: synced.length });
    }
}

export function useCreateAccount(options?: { setActive?: boolean }) {
    const t = useTranslate();
    const client = useQueryClient();
    const factory = useAccountsFactory();
    const { mutateAsync: setActive } = useSetActiveAccount();
    const newAccountName = useNewAccountDefaultName();
    const updateSyncStorage = useAccountSyncStorageUpdate();
    const generateOwnMeta = useGenerateOwnSyncedDeviceMeta();
    const { deviceInfo } = useAppContext();
    const logger = useLogger('account');

    return useMutation<
        ISyncAccount<SyncedStorageStructure>,
        Error,
        {
            name?: string;
            secureEncryptedStorage: ITreeStorage;
            firstPortfolio?: AccountPortfolioSource;
        },
        unknown
    >({
        async mutationFn(params) {
            logger.info('creating account', {
                firstPortfolio: params.firstPortfolio?.kind ?? 'none',
                setActive: !!options?.setActive
            });
            await delay();

            const account = await factory.createSyncAccount(params.secureEncryptedStorage);

            let createdPortfolio: SPortfolio | null = null;
            let nextDerivingInfo: SNextDerivingPortfolioInfo = null;
            if (params.firstPortfolio) {
                const built = await buildFirstPortfolio({
                    account,
                    secureEncryptedStorage: params.secureEncryptedStorage,
                    source: params.firstPortfolio,
                    portfolioName: t('security.groups.wallet.defaultName', { number: 1 }),
                    deviceName: deviceInfo.name,
                    logger
                });
                createdPortfolio = built.portfolio;
                nextDerivingInfo = built.nextDerivingInfo;
            }

            const analyticsId = await deriveAnalyticsAccountUuid(
                account,
                params.secureEncryptedStorage
            );

            await updateSyncStorage(account, draft => {
                draft.set('meta', { name: params?.name ?? newAccountName });

                const { key, value } = generateOwnMeta(account);
                draft.at('devicesMeta').orDefault({}).set(key, value);

                draft.at('analyticsId').set(analyticsId);

                if (createdPortfolio) {
                    draft.set('portfolios', [createdPortfolio]);
                    draft.set('nextDerivingPortfolioInfo', nextDerivingInfo);
                }
            });

            await client.invalidateQueries({ queryKey: accountKey.list.toKey() });

            if (options?.setActive) {
                await setActive(account.accountId);
            }

            logger.info('account created', { accountId: account.accountId });

            return account;
        }
    });
}

function useConnectorMutation<TVars>(
    createConnector: (vars: TVars) => Promise<RawOnboardingConnector<SyncedStorageStructure>>
) {
    const mutation = useMutation<OnboardingConnector, Error, TVars>({
        async mutationFn(vars) {
            await delay();
            const connector = await createConnector(vars);

            return {
                connectionString: connector.data.toString('base64url'),
                onboardedPromise: connector.waitForCompletion().then(onboarded => ({
                    account: onboarded.account,
                    inviterIkPubHex: onboarded.inviterIkPub?.toString('hex') ?? null
                })),
                abort() {
                    connector.abort();
                }
            };
        }
    });

    const originalReset = mutation.reset;

    const reset = useCallback(() => {
        mutation.data?.abort();
        originalReset();
    }, [mutation.data, originalReset]);

    return {
        ...mutation,
        reset
    };
}

export function useCreateExistingAccountConnector() {
    const factory = useAccountsFactory();

    return useConnectorMutation(
        ({ secureEncryptedStorage }: { secureEncryptedStorage: ITreeStorage }) =>
            factory.connectToExistingSyncAccount(secureEncryptedStorage)
    );
}

export function useAccountConnectedCallback(
    connector: OnboardingConnector | undefined,
    callback: (onboarded: OnboardedAccount) => void,
    options?: { setAsActive: boolean; onError?: (e: Error) => void }
) {
    const logger = useLogger('account-connect');
    const client = useQueryClient();
    const { mutateAsync: setActive } = useSetActiveAccount();
    const { mutateAsync: updateOwnSyncedDeviceMeta } = useSetOwnSyncedDeviceMeta();
    const setAsActive = options?.setAsActive ?? false;

    useEffect(() => {
        let isReset = false;
        connector?.onboardedPromise
            .then(async onboarded => {
                const { account } = onboarded;

                if (isReset) {
                    return;
                }

                await updateOwnSyncedDeviceMeta(account);

                if (isReset) {
                    return;
                }

                await client.invalidateQueries({ queryKey: accountKey.list.toKey() });
                if (setAsActive) {
                    await setActive(account.accountId);
                }

                logger.info('device onboarding completed', {
                    accountId: account.accountId,
                    setAsActive,
                    hasInviter: onboarded.inviterIkPubHex !== null
                });

                if (onboarded.inviterIkPubHex !== null) {
                    await waitForDeviceMeta(account.accountId, onboarded.inviterIkPubHex, logger);
                }

                if (isReset) {
                    return;
                }

                callback(onboarded);
            })
            .catch(e => {
                if (isReset) {
                    return;
                }

                if (e instanceof OnboardingAbortedError) {
                    logger.info('device onboarding aborted');
                    return;
                }

                logger.error(e);
                options?.onError?.(e instanceof Error ? e : new Error(String(e)));
            });
        return () => {
            connector?.abort();
            isReset = true;
        };
    }, [connector?.onboardedPromise, callback, client, setAsActive]);
}

const DEVICE_META_TIMEOUT_MS = 10_000;

async function waitForDeviceMeta(
    accountId: string,
    ikPubHex: string,
    logger: Logger
): Promise<void> {
    const hasMeta = () =>
        accountStore.getState().accountsData.get(accountId)?.devicesMeta?.[ikPubHex] !== undefined;

    try {
        await waitForChange({
            subscribe: observer => accountStore.subscribe(observer),
            predicate: hasMeta,
            timeoutMs: DEVICE_META_TIMEOUT_MS,
            timeoutError: () => new Error('Device meta did not arrive')
        });
    } catch (e) {
        logger.warn('device meta wait timed out', { ikPubHex, error: e });
    }
}

export function useConnectAccountToNewDevice() {
    const activeAccount = useActiveAccount();
    const errorToast = useErrorToast({
        ReconnectFromAnotherAccountError: 'settings.qrCodeFromAnotherAccount'
    });
    const { withLoader } = useLoader();
    const { qrScanner } = useAppContext();
    const scopedLogger = useLogger('account');

    return useMutation<string, Error, { secureEncryptedStorage: ITreeStorage }, unknown>({
        async mutationFn({ secureEncryptedStorage }) {
            const connectionString = await qrScanner.scan({
                titleTranslationKey: 'qrScan.addDevice.title',
                subTranslationKey: 'qrScan.addDevice.subtitle'
            });
            scopedLogger.info('connecting new device to active account', {
                accountId: activeAccount.accountId
            });
            return await withLoader(async () => {
                const { newDeviceIkPub } = await activeAccount.connectToNewDevice(
                    Buffer.from(connectionString, 'base64url'),
                    secureEncryptedStorage
                );
                const ikPubHex = newDeviceIkPub.toString('hex');
                await waitForDeviceMeta(activeAccount.accountId, ikPubHex, scopedLogger);

                return ikPubHex;
            });
        },
        onSuccess() {
            scopedLogger.info('new device connected');
        },
        onError(error) {
            scopedLogger.error('connecting new device failed', error);
            errorToast(error);
        }
    });
}

export function useSetActiveAccount() {
    const { set } = useSharedUxStorage('activeAccount');
    const client = useQueryClient();
    const accountsQuery = useAccountsQueryConfig();
    const logger = useLogger('account');

    return useMutation<void, Error, string>({
        async mutationFn(id) {
            logger.info('start set account active', { accountId: id });
            await delay();
            await set(id);

            const activePortfolioKey = accountKey.accountId(id).activePortfolio.toKey();
            if (client.getQueryData(activePortfolioKey) === undefined) {
                const accounts = await client.fetchQuery(accountsQuery);
                const account = accounts.find(a => a.accountId === id);
                if (!account) {
                    throw new Error('Account not found');
                }

                const portfolio = account.syncProvider.get('portfolios')[0];
                client.setQueryData<SActivePortfolioSchema>(
                    activePortfolioKey,
                    portfolio
                        ? {
                              portfolioId: toPortfolioId(portfolio).toString()
                          }
                        : null
                );
            }

            await client.refetchQueries({
                queryKey: accountKey.list.active.toKey()
            });
            logger.info('set account active complete', { accountId: id });
        }
    });
}

export function useChangeAccountMeta() {
    const currentMeta = useActiveAccountMeta();
    const update = useActiveAccountSyncStorageSlotUpdate('meta');

    return useMutation<void, Error, Partial<AccountMeta>>({
        async mutationFn(meta) {
            await update(draft => draft.set({ ...currentMeta, ...meta }));
        }
    });
}

export function useDeleteAccount() {
    const account = useActiveAccount();
    const accountFactory = useAccountsFactory();
    const client = useQueryClient();
    const ikPub = useCurrentDeviceIkPub();
    const clearActiveAccountLocalStorage = useClearActiveAccountLocalStorage();
    const update = useActiveAccountSyncStorageUpdate();
    const logger = useLogger('account');

    return useMutation<void, Error, ITreeStorage>({
        async mutationFn(secureEncryptedStorage) {
            logger.info('deleting account', { accountId: account.accountId });
            await update(draft => {
                draft
                    .at('devicesArchive')
                    .entry(ikPub)
                    .set({ archivedAt: Date.now(), archivedFromIkPubHex: null });
            });

            await accountFactory.deleteLocalAccount(account.accountId, secureEncryptedStorage);
            await clearActiveAccountLocalStorage();

            const accounts = client.getQueryData<SyncAccount[]>(accountKey.list.toKey());
            const remaining = accounts?.filter(a => a.accountId !== account.accountId) ?? [];

            logger.info('account deleted', { remainingAccounts: remaining.length });

            if (remaining.length > 0) {
                client.setQueryData(accountKey.list.toKey(), remaining);
                client.setQueryData(accountKey.list.active.toKey(), remaining[0]);
            }
        }
    });
}

const ARCHIVE_ON_ERASE_TIMEOUT_MS = 3000;

export function useEraseAllData() {
    const {
        clearAllData,
        reloadApp,
        i18n: { t }
    } = useAppContext();
    const toast = useToast();
    const accounts = useAccounts();
    const scopedLogger = useLogger('account');

    return useMutation({
        async mutationFn() {
            scopedLogger.info('erasing all data');

            await archiveOwnDevices(accounts, scopedLogger);

            try {
                await clearAllData();
                reloadApp();
            } catch (e) {
                toast({ type: 'error', message: t('logOutAllAccounts.error') });
                throw e;
            }
        }
    });
}
