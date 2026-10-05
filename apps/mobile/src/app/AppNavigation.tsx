import type { Theme } from '@react-navigation/native';
import { DarkTheme } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { Activity, useEffect, useMemo } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import { PushSubscriptionSyncProvider, SyncStorageProvider } from '@safely/ux';

import { useLockScreenControl } from '@mobile/entities/security';
import { BleManagerProvider } from '@mobile/features/ledger';

import Navigation from './navigation';
import { navigationRef } from './navigation/navigationRef';
import { useInitialNavigationState } from './navigation/useInitialNavigationState';
import { useLockAwareLinking } from './navigation/useLockAwareLinking';
import { useRestrictionGuard } from './navigation/useRestrictionGuard';
import { SelfUnarchiveWatcher } from './SelfUnarchiveWatcher';

export function AppNavigation() {
    const { theme } = useUnistyles();
    const { isLocked } = useLockScreenControl();
    const linking = useLockAwareLinking(isLocked);
    const initialState = useInitialNavigationState();
    const enforceRestriction = useRestrictionGuard();

    const NavigationTheme: Theme = useMemo(
        () => ({
            ...DarkTheme,
            colors: {
                primary: theme.colors.accent.accent,
                background: theme.colors.background.primary,
                card: theme.colors.background.primary,
                text: theme.colors.text.primary,
                border: theme.colors.other.hover,
                notification: theme.colors.accent.accent
            }
        }),
        [theme]
    );

    useEffect(() => {
        // It fixes animation white flickering on Android when animating between screens
        SystemUI.setBackgroundColorAsync(theme.colors.background.primary);
    }, [theme.colors.background.primary]);

    useEffect(() => {
        if (isLocked) {
            SplashScreen.hideAsync();
        }
    }, [isLocked]);

    return (
        <BleManagerProvider>
            <SyncStorageProvider>
                <PushSubscriptionSyncProvider>
                    <Activity mode={isLocked ? 'hidden' : 'visible'}>
                        <SelfUnarchiveWatcher />
                        <Navigation
                            ref={navigationRef}
                            initialState={initialState}
                            onReady={() => {
                                enforceRestriction();
                                SplashScreen.hideAsync();
                            }}
                            theme={NavigationTheme}
                            linking={linking}
                        />
                    </Activity>
                </PushSubscriptionSyncProvider>
            </SyncStorageProvider>
        </BleManagerProvider>
    );
}
