import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';
import { StyleSheet } from 'react-native-unistyles';

import { useLockScreenControl } from '@mobile/entities/security';

import { LockContent } from './LockContent';

const OverlayComponent = Platform.OS === 'ios' ? FullWindowOverlay : View;

export const LockOverlay = () => {
    const { isLocked, unlock } = useLockScreenControl();

    if (!isLocked) {
        return null;
    }

    return (
        <OverlayComponent style={StyleSheet.absoluteFill}>
            <GestureHandlerRootView style={StyleSheet.absoluteFill}>
                <LockContent onUnlock={unlock} />
            </GestureHandlerRootView>
        </OverlayComponent>
    );
};
