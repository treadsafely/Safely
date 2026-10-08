import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
    AnalyticsProvider,
    createPersister,
    createQueryClient,
    LedgerSessionProvider,
    QueryProvider
} from '@safely/ux';

import { BlurOverlay, LockScreenProvider } from '@mobile/entities/security';
import { LockOverlay } from '@mobile/features/app-lock';
import { logger } from '@mobile/shared/logger';
import { LoaderProvider, LoaderServiceProvider } from '@mobile/shared/providers/loader';
import { ToastProvider, ToastServiceProvider } from '@mobile/shared/providers/toast';

import { AppContextProvider, SecurityCheckInitializer } from './AppContext';
import { AppNavigation } from './AppNavigation';
import { navigationRef } from './navigation/navigationRef';
import { RootErrorBoundary } from './root-error-boundary';
import { RootSuspenseGate } from './root-suspense';
import { REGULAR_MOBILE_STORAGE_ONLY_APP_LEVEL_USE } from './storage';
import { createTanstackEventListeners } from './tanstack-query-managers';

const persister = createPersister(
    REGULAR_MOBILE_STORAGE_ONLY_APP_LEVEL_USE.storage.child('persister'),
    logger
);
const queryClient = createQueryClient(logger);
const eventListeners = createTanstackEventListeners();
const openLedgerConnectScreen = () => navigationRef.navigate('ConnectToSignSheet');

export const App = () => {
    return (
        <GestureHandlerRootView>
            <SafeAreaProvider>
                <RootErrorBoundary>
                    <KeyboardProvider>
                        <QueryProvider
                            persister={persister}
                            queryClient={queryClient}
                            eventListeners={eventListeners}
                        >
                            <ToastServiceProvider>
                                <LoaderServiceProvider>
                                    <AppContextProvider>
                                        <LedgerSessionProvider
                                            openConnectScreen={openLedgerConnectScreen}
                                        >
                                            <RootSuspenseGate>
                                                <AnalyticsProvider>
                                                    <SecurityCheckInitializer />
                                                    <LoaderProvider>
                                                        <LockScreenProvider>
                                                            <AppNavigation />
                                                            <LockOverlay />
                                                        </LockScreenProvider>
                                                        <ToastProvider />
                                                    </LoaderProvider>
                                                </AnalyticsProvider>
                                            </RootSuspenseGate>
                                        </LedgerSessionProvider>
                                        <BlurOverlay />
                                    </AppContextProvider>
                                </LoaderServiceProvider>
                            </ToastServiceProvider>
                        </QueryProvider>
                    </KeyboardProvider>
                </RootErrorBoundary>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
};
