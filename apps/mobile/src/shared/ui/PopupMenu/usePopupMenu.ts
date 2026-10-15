import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent, View } from 'react-native';
import { Platform, StatusBar } from 'react-native';
import {
    interpolateColor,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useScreenContext } from '../Screen/Screen.context';

export const usePopupMenu = (screenHeight: number, menuMargin = 8) => {
    const triggerRef = useRef<View>(null);
    const triggerFrame = useSharedValue({ x: 0, y: 0, width: 0, height: 0 });
    const [visible, setVisible] = useState(false);

    const triggerHeight = useSharedValue(0);
    const menuHeight = useSharedValue(0);
    const scale = useSharedValue(0.75);
    const progress = useSharedValue(0);
    const isClosing = useSharedValue(false);

    const { layout } = useScreenContext();
    const { top } = useSafeAreaInsets();
    const offsetY =
        Platform.OS === 'ios' && layout === 'modal'
            ? top + 10
            : Platform.OS === 'android'
              ? (StatusBar.currentHeight ?? 0)
              : 0;

    const open = useCallback(() => {
        requestAnimationFrame(() => {
            isClosing.value = false;
            triggerRef.current?.measureInWindow((x, y, width, height) => {
                triggerHeight.value = height;
                triggerFrame.value = {
                    x,
                    y: y + offsetY,
                    width,
                    height
                };
                setVisible(true);
            });
        });
    }, [offsetY, triggerHeight, triggerFrame, isClosing]);

    // isClosing is reset only in open: a late Android onMenuLayout would otherwise leave progress at 1
    const hide = useCallback(() => {
        progress.value = 0;
        scale.value = 0.75;
        setVisible(false);
    }, [progress, scale]);

    const close = useCallback(() => {
        isClosing.value = true;
        progress.value = withTiming(0, { duration: 50 });
        scale.value = withTiming(0.75, { duration: 50 }, finished => {
            if (finished) {
                scheduleOnRN(hide);
            }
        });
    }, [progress, scale, hide, isClosing]);

    const onMenuLayout = useCallback(
        (e: LayoutChangeEvent) => {
            menuHeight.value = e.nativeEvent.layout.height;
            if (isClosing.value) {
                return;
            }
            progress.value = withTiming(1, { duration: 50 });
            scale.value = withTiming(1, { duration: 50 });
        },
        [menuHeight, progress, scale, isClosing]
    );

    const triggerFrameStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        top: triggerFrame.value.y,
        left: triggerFrame.value.x,
        width: triggerFrame.value.width,
        height: triggerFrame.value.height
    }));

    const blurAnimatedProps = useAnimatedProps(() => ({
        intensity: progress.value * 80
    }));

    const blurAnimatedStyle = useAnimatedStyle(
        () => ({
            backgroundColor: interpolateColor(
                progress.value,
                [0, 1],
                ['transparent', 'rgba(0, 0, 0, 0.85)']
            )
        }),
        [progress]
    );

    const opacityAnimatedStyle = useAnimatedStyle(
        () => ({
            opacity: progress.value
        }),
        [progress]
    );

    const compactMenuAnimatedStyle = useAnimatedStyle(() => {
        const menuCenterY = triggerFrame.value.y + triggerFrame.value.height / 2;

        return {
            top: menuCenterY - menuHeight.value / 2,
            left: triggerFrame.value.x + triggerFrame.value.width,
            opacity: progress.value,
            transform: [{ scale: scale.value }, { translateX: '-100%' }],
            transformOrigin: '100% 50%'
        };
    }, [triggerFrame, menuHeight, progress, scale]);

    const menuAnimatedStyle = useAnimatedStyle(() => {
        const spaceBelow = screenHeight - (triggerFrame.value.y + triggerHeight.value + menuMargin);
        const showBelow =
            spaceBelow >= menuHeight.value || triggerFrame.value.y < menuHeight.value + menuMargin;

        return {
            top: showBelow
                ? triggerFrame.value.y + triggerHeight.value + menuMargin
                : triggerFrame.value.y - menuHeight.value - menuMargin,
            transformOrigin: showBelow ? '50% 0%' : '50% 100%',
            opacity: progress.value,
            transform: [{ scale: scale.value }]
        };
    }, [screenHeight, triggerFrame, triggerHeight, menuHeight, progress, scale]);

    return {
        visible,
        triggerRef,
        triggerFrame,
        triggerFrameStyle,
        progress,
        open,
        close,
        onMenuLayout,
        blurAnimatedProps,
        blurAnimatedStyle,
        opacityAnimatedStyle,
        menuAnimatedStyle,
        compactMenuAnimatedStyle
    };
};
