import {
    impactAsync,
    ImpactFeedbackStyle,
    notificationAsync,
    NotificationFeedbackType
} from 'expo-haptics';
import { useCallback, useEffect, useMemo } from 'react';
import type { LayoutChangeEvent, ViewProps } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    Extrapolation,
    FadeIn,
    FadeOut,
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';
import { runOnJS } from 'react-native-worklets';

import { ArrowRight28, Icon, Loader28 } from '../Icon';
import { Text } from '../Text';
import { COMPLETE_THRESHOLD, KNOB_WIDTH, SPRING_CONFIG, TRACK_HORIZONTAL_PADDING } from './config';
import { styles } from './SlideButton.styles';

type SlideButtonProps = ViewProps & {
    label: string;
    description: string;
    disabled?: boolean;
    loading?: boolean;
    onSlideComplete?: () => void;
    trackColor?: string;
    knobColor?: string;
    textColor?: string;
    /** testID for the draggable knob — e2e swipe gestures must start on the knob, not the track */
    knobTestID?: string;
};

export const SlideButton = (props: SlideButtonProps) => {
    const {
        label,
        description,
        style,
        disabled,
        loading,
        onSlideComplete,
        trackColor,
        knobColor,
        textColor,
        knobTestID,
        ...rest
    } = props;
    const { theme } = useUnistyles();

    const translateX = useSharedValue(0);
    const maxTranslateX = useSharedValue(0);
    const startX = useSharedValue(0);
    const rotation = useSharedValue(0);
    const inactiveProgress = useSharedValue(disabled || loading ? 1 : 0);

    useEffect(() => {
        inactiveProgress.value = withTiming(disabled || loading ? 1 : 0, {
            duration: 200,
            easing: Easing.out(Easing.ease)
        });
    }, [disabled, loading, inactiveProgress]);

    useEffect(() => {
        if (loading) {
            if (maxTranslateX.value > 0) {
                translateX.value = withSpring(maxTranslateX.value, SPRING_CONFIG);
            }
            rotation.value = withRepeat(
                withTiming(360, { duration: 1000, easing: Easing.linear }),
                -1,
                false
            );
        } else {
            translateX.value = withSpring(0, SPRING_CONFIG);
            rotation.value = 0;
        }
    }, [loading, maxTranslateX, translateX, rotation]);

    const handleComplete = useCallback(() => {
        void notificationAsync(NotificationFeedbackType.Success);
        onSlideComplete?.();
    }, [onSlideComplete]);

    const hapticGrab = useCallback(() => {
        void impactAsync(ImpactFeedbackStyle.Light);
    }, []);

    const hapticDrop = useCallback(() => {
        void notificationAsync(NotificationFeedbackType.Warning);
    }, []);

    const onTrackLayout = useCallback(
        (event: LayoutChangeEvent) => {
            const { width } = event.nativeEvent.layout;

            maxTranslateX.value =
                width - KNOB_WIDTH - TRACK_HORIZONTAL_PADDING * 2 > 0
                    ? width - KNOB_WIDTH - TRACK_HORIZONTAL_PADDING * 2
                    : 0;
        },
        [maxTranslateX]
    );

    const panGesture = useMemo(() => {
        return Gesture.Pan()
            .enabled(!disabled && !loading)
            .onBegin(() => {
                'worklet';
                startX.value = translateX.value;
                runOnJS(hapticGrab)();
            })
            .onUpdate(event => {
                'worklet';
                const nextX = startX.value + event.translationX;
                translateX.value = Math.min(Math.max(nextX, 0), maxTranslateX.value);
            })
            .onEnd(() => {
                'worklet';

                const shouldComplete =
                    maxTranslateX.value > 0 &&
                    translateX.value > maxTranslateX.value * COMPLETE_THRESHOLD;

                if (shouldComplete) {
                    translateX.value = withSpring(maxTranslateX.value, SPRING_CONFIG);
                    runOnJS(handleComplete)();
                } else {
                    translateX.value = withSpring(0, SPRING_CONFIG);
                    runOnJS(hapticDrop)();
                }
            });
    }, [
        disabled,
        loading,
        handleComplete,
        hapticGrab,
        hapticDrop,
        maxTranslateX,
        startX,
        translateX
    ]);

    const activeBg = knobColor ?? theme.colors.button.primary.background;
    const inactiveBg = theme.colors.button.tertiary.background;

    const knobStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        backgroundColor: interpolateColor(inactiveProgress.value, [0, 1], [activeBg, inactiveBg])
    }));

    const iconPrimaryOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(inactiveProgress.value, [0, 1], [1, 0])
    }));

    const iconSecondaryOpacityStyle = useAnimatedStyle(() => ({
        opacity: inactiveProgress.value
    }));

    const loaderStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }]
    }));

    const textAnimatedStyle = useAnimatedStyle(() => {
        if (maxTranslateX.value <= 0) {
            return {};
        }

        const opacity = interpolate(
            translateX.value,
            [0, maxTranslateX.value * 0.2],
            [1, 0],
            Extrapolation.CLAMP
        );

        return { opacity };
    });

    return (
        <View
            style={[styles.container, trackColor && { backgroundColor: trackColor }, style]}
            onLayout={onTrackLayout}
            {...rest}
        >
            <Animated.View style={[styles.textContainer, textAnimatedStyle]} pointerEvents="none">
                <Text
                    variant="labelL"
                    color={disabled ? 'secondary' : undefined}
                    textAlign="center"
                    style={textColor ? { color: textColor } : undefined}
                >
                    {label}
                </Text>
                {!!description && (
                    <Animated.View
                        key={description}
                        style={styles.descriptionWrapper}
                        entering={FadeIn.duration(150)}
                        exiting={FadeOut.duration(150)}
                    >
                        <Text
                            variant="bodyM"
                            color="tertiary"
                            textAlign="center"
                            style={textColor ? { color: textColor } : undefined}
                        >
                            {description}
                        </Text>
                    </Animated.View>
                )}
            </Animated.View>

            <GestureDetector gesture={panGesture}>
                <Animated.View style={styles.knobWrapper}>
                    {/* testID on the knob itself: the wrapper stretches to the full track,
                        so a directional swipe from its center falls short of the threshold */}
                    <Animated.View style={[styles.knob, knobStyle]} testID={knobTestID}>
                        {loading ? (
                            <Animated.View style={loaderStyle}>
                                <Icon icon={Loader28} color="primary" />
                            </Animated.View>
                        ) : (
                            <View>
                                <Animated.View
                                    style={[
                                        StyleSheet.absoluteFill,
                                        styles.iconOverlay,
                                        iconPrimaryOpacityStyle
                                    ]}
                                >
                                    <Icon icon={ArrowRight28} color="primary" />
                                </Animated.View>
                                <Animated.View
                                    style={[
                                        StyleSheet.absoluteFill,
                                        styles.iconOverlay,
                                        iconSecondaryOpacityStyle
                                    ]}
                                >
                                    <Icon icon={ArrowRight28} color="secondary" />
                                </Animated.View>
                            </View>
                        )}
                    </Animated.View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
};
