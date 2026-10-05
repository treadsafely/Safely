import GHBottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';

import { Screen } from '../Screen';
import { styles } from './BottomSheet.styles';
import { BottomSheetContext } from './context';

export { useBottomSheet, useBottomSheetContext } from './context';

export type BottomSheetProps = {
    children: React.ReactNode;
    containerStyle?: ViewStyle;
    closeOnBackdropPress?: boolean;
    onClose?: () => void;
    headerTitle?: string;
    shortHeader?: boolean;
};

export type BottomSheetRef = {
    close: () => void;
};

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(function (
    {
        children,
        containerStyle,
        closeOnBackdropPress = true,
        headerTitle,
        shortHeader = false,
        onClose
    },
    forwardedRef
) {
    const ref = useRef<GHBottomSheet>(null);
    const { theme } = useUnistyles();

    const index = useSharedValue(-1);

    const overlayStyle = useAnimatedStyle(() => {
        return {
            backgroundColor: interpolateColor(
                index.value,
                [-1, 0],
                ['transparent', theme.colors.background.overlay]
            )
        };
    });

    const handleClosed = useCallback(() => {
        onClose?.();
    }, [onClose]);

    const requestClose = useCallback(() => {
        if (index.value >= 0) ref.current?.close();
    }, [index]);

    useImperativeHandle(forwardedRef, () => ({ close: requestClose }), [requestClose]);

    const contextValue = useMemo(() => ({ close: requestClose }), [requestClose]);

    return (
        <BottomSheetContext.Provider value={contextValue}>
            <Animated.View style={[styles.overlay, overlayStyle]}>
                {closeOnBackdropPress ? (
                    <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
                ) : (
                    <Pressable style={StyleSheet.absoluteFill} />
                )}

                <GHBottomSheet
                    ref={ref}
                    index={0}
                    enableDynamicSizing
                    enablePanDownToClose
                    onClose={handleClosed}
                    onChange={i => {
                        index.value = i;
                    }}
                    backgroundStyle={styles.sheetBg}
                    handleComponent={null}
                    animatedIndex={index}
                >
                    <BottomSheetView style={containerStyle}>
                        <Screen background="transparent" layout="sheet">
                            <Screen.Header variant="left" shortHeader={shortHeader}>
                                {headerTitle ? (
                                    <Screen.Header.Title>{headerTitle}</Screen.Header.Title>
                                ) : (
                                    <View style={{ flex: 1 }} />
                                )}
                                <Screen.Header.CloseButton />
                            </Screen.Header>
                            <Screen.Content>{children}</Screen.Content>
                        </Screen>
                    </BottomSheetView>
                </GHBottomSheet>
            </Animated.View>
        </BottomSheetContext.Provider>
    );
});
