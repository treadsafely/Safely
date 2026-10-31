import type { FC, PropsWithChildren, ReactNode } from 'react';
import { Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { LoggableStorage, TreeStorage, WebNumberFormatLocale } from '@safely/core';
import type { IAppContext, Security } from '@safely/ux';
import {
    AppContext,
    createPersister,
    createQueryClient,
    LedgerSessionProvider,
    NO_LOCKOUT,
    QueryProvider,
    SyncStorageProvider,
    UnlockableSecuredEncryptedStorage
} from '@safely/ux';
import {
    FatalErrorPage,
    loaderService,
    LoaderViewport,
    ErrorBoundary,
    ScreenProtectionProvider,
    toastService,
    ToastViewport,
    WebLinking
} from '@safely/web-ui';

import {
    authenticateBiometry,
    createLedgerTransport,
    isBiometryUnlockEnabled,
    passcodePrompt,
    qrScanPrompt
} from '../features';
import { fileTransport, logger } from '../logger';
import { platform } from '../platform';
import { unsupportedPushNotifications } from '../platform/unsupported';
import { desktopLayerEncryptedStorage, desktopLayerSynchronousGlobalStorage } from '../shared';

export interface AppProvidersProps {
    loader?: ReactNode;
}

async function clearLockoutAfterFactor(): Promise<void> {
    const current = await desktopLayerEncryptedStorage.get('passcodeLockout');

    if (current !== null && current.failedAttempts !== 0) {
        await desktopLayerEncryptedStorage.set('passcodeLockout', NO_LOCKOUT);
    }
}

const securityGate: Security = {
    async check(options) {
        if ((await isBiometryUnlockEnabled()) && (await authenticateBiometry())) {
            await clearLockoutAfterFactor();
            return;
        }

        if ((await desktopLayerEncryptedStorage.get('passcode')) === null) {
            throw new Error('Passcode is not set');
        }

        await passcodePrompt.request(options);
    }
};

const queryClient = createQueryClient(logger);
const ledgerTransport = createLedgerTransport(logger);
const persister = createPersister(
    TreeStorage.root(platform.storage.REGULAR_DESKTOP_STORAGE_ONLY_APP_LEVEL_USE).child(
        'persister'
    ),
    logger
);

export const AppProviders: FC<PropsWithChildren<AppProvidersProps>> = ({ loader, children }) => {
    const {
        t,
        i18n: { language }
    } = useTranslation();

    const appContext = useMemo<IAppContext>(() => {
        const { appInfo, storage } = platform;
        const regular = TreeStorage.root(storage.REGULAR_DESKTOP_STORAGE_ONLY_APP_LEVEL_USE);
        const encrypted = TreeStorage.root(storage.ENCRYPTED_DESKTOP_STORAGE_ONLY_APP_LEVEL_USE);

        return {
            version: appInfo.version,
            build: appInfo.build,
            environment: appInfo.environment,
            deviceInfo: {
                name: appInfo.deviceName,
                osVersion: appInfo.osVersion
            },
            /* no app store here, so only the OS region is known */
            getUserCountryInfo: () =>
                Promise.resolve({
                    storeCode: null,
                    deviceCode: appInfo.deviceCountryCode
                }),
            /* read once at boot; the dev-tools config section writes devToken then reloads */
            devToken: desktopLayerSynchronousGlobalStorage.get('devToken') ?? undefined,
            devIsTestnetAllowed:
                desktopLayerSynchronousGlobalStorage.get('devIsTestnetAllowed') === true,
            numberFormatLocale: new WebNumberFormatLocale(appInfo.locale),
            storage: {
                ux: {
                    regular: regular.child('ux')
                },
                sync: {
                    regular: regular.child('sync'),
                    encrypted: encrypted.child('sync'),
                    getSecureEncrypted: () =>
                        new UnlockableSecuredEncryptedStorage(
                            new LoggableStorage(
                                storage.SECURE_ENCRYPTED_DESKTOP_STORAGE_ONLY_APP_LEVEL_USE,
                                logger,
                                'SecureEncryptedStorage'
                            ),
                            securityGate,
                            ['sync']
                        )
                }
            },
            qrScanner: {
                scan: options =>
                    qrScanPrompt.request({
                        title: t(options?.titleTranslationKey ?? 'qrScan.title'),
                        subtitle: t(options?.subTranslationKey ?? 'qrScan.subtitle')
                    })
            },
            toast: toastService,
            loader: loaderService,
            linking: new WebLinking(logger, url => platform.openExternalUrl(url)),
            i18n: { language, t },
            logger,
            ledgerTransport,
            pushNotifications: unsupportedPushNotifications,
            security: securityGate,
            clearAllData: async () => {
                await platform.clearAllData();
                fileTransport.reset();
            },
            reloadApp: () => platform.reloadApp(),
            subscribeAppStateChange: callback => platform.subscribeAppStateChange(callback)
        };
    }, [language, t]);

    return (
        <QueryProvider persister={persister} queryClient={queryClient} loader={loader}>
            <AppContext value={appContext}>
                <ScreenProtectionProvider protect={platform.protectScreen}>
                    <ErrorBoundary
                        logger={logger}
                        fallback={<FatalErrorPage onShareLogs={() => void platform.logs.share()} />}
                    >
                        <LedgerSessionProvider>
                            <Suspense fallback={loader}>
                                <SyncStorageProvider>{children}</SyncStorageProvider>
                            </Suspense>
                        </LedgerSessionProvider>
                    </ErrorBoundary>
                </ScreenProtectionProvider>
                <ToastViewport />
                <LoaderViewport />
            </AppContext>
        </QueryProvider>
    );
};
