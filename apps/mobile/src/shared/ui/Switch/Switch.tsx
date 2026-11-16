import * as Haptics from 'expo-haptics';
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated, {
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing
} from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';

import { styles, THUMB_WIDTH, TRACK_PADDING } from './Switch.styles';

type SwitchProps = {
    value: boolean;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    duration?: number;
    trackColors?: { on: string; off: string };
    disabled?: boolean;
};

export const Switch = (props: SwitchProps) => {
    const { value, onPress, style, duration = 180, disabled = false } = props;
    const width = useSharedValue(0);
    const isPressedIn = useSharedValue(false);
    const isOn = useSharedValue(value);
    const { theme } = useUnistyles();

    styles.useVariants({ disabled });

    React.useEffect(() => {
        isOn.value = value;
    }, [isOn, value]);

    const handlePress = React.useCallback(() => {
        Haptics.selectionAsync();
        onPress();
    }, [onPress]);

    const trackAnimatedStyle = useAnimatedStyle(() => {
        const color = interpolateColor(
            Number(isOn.value),
            [0, 1],
            [theme.colors.background.tertiary, theme.colors.accent.accent]
        );
        const colorValue = withTiming(color, { duration });

        return {
            backgroundColor: colorValue
        };
    });

    const thumbAnimatedStyle = useAnimatedStyle(() => {
        const maxTranslate = Math.max(0, width.value - THUMB_WIDTH - TRACK_PADDING * 2);
        const moveValue = interpolate(Number(isOn.value), [0, 1], [0, maxTranslate]);
        const pressedWidth = isPressedIn.value ? THUMB_WIDTH + TRACK_PADDING * 2 : THUMB_WIDTH;
        const extraWidth = pressedWidth - THUMB_WIDTH;
        const adjustedMoveValue =
            isOn.value && isPressedIn.value ? Math.max(0, moveValue - extraWidth) : moveValue;
        const translateValue = withTiming(adjustedMoveValue, {
            duration,
            easing: Easing.inOut(Easing.bezierFn(0.42, 0, 0.58, 1))
        });

        return {
            transform: [{ translateX: translateValue }],
            width: withTiming(pressedWidth, {
                duration,
                easing: Easing.inOut(Easing.bezierFn(0.42, 0, 0.58, 1))
            })
        };
    });

    return (
        <Pressable
            disabled={disabled}
            onPress={handlePress}
            onPressIn={() => {
                isPressedIn.value = true;
            }}
            onPressOut={() => {
                isPressedIn.value = false;
            }}
            style={styles.container}
        >
            <Animated.View
                onLayout={e => {
                    width.value = e.nativeEvent.layout.width;
                }}
                style={[styles.track, style, trackAnimatedStyle]}
            >
                <Animated.View style={[styles.thumb, thumbAnimatedStyle]}></Animated.View>
            </Animated.View>
        </Pressable>
    );
};
