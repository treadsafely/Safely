import { useState } from 'react';
import Animated, {
    Easing,
    type SharedValue,
    useAnimatedProps,
    useAnimatedReaction,
    useAnimatedStyle,
    withTiming
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTranslate } from '@safely/ux';

import { Toast, useScreenHeaderHeight } from '@mobile/shared/ui';

import {
    HIDE_DURATION,
    HIDE_TRANSLATE_DURATION,
    ANIMATION_START_Y,
    SHOW_DURATION,
    SHOW_TRANSLATE_DURATION,
    styles
} from './NewTransactionsBubble.styles';
import { NewTransactionsBubbleMode } from './useNewTransactionsBubble';

export type NewTransactionsBubbleProps = {
    mode: SharedValue<NewTransactionsBubbleMode>;
    onPress: () => void;
};

export const NewTransactionsBubble = (props: NewTransactionsBubbleProps) => {
    const { mode, onPress } = props;
    const t = useTranslate();
    const screenHeaderHeight = useScreenHeaderHeight();

    const [labelState, setLabelState] = useState<NewTransactionsBubbleMode>(
        NewTransactionsBubbleMode.HIDDEN
    );

    useAnimatedReaction(
        () => mode.value,
        (current, previous) => {
            if (current !== previous && current !== NewTransactionsBubbleMode.HIDDEN) {
                scheduleOnRN(setLabelState, current);
            }
        }
    );

    const animatedStyle = useAnimatedStyle(() => {
        if (mode.value !== NewTransactionsBubbleMode.HIDDEN) {
            return {
                opacity: withTiming(1, {
                    duration: SHOW_DURATION,
                    easing: Easing.out(Easing.cubic)
                }),
                transform: [
                    {
                        translateY: withTiming(0, {
                            duration: SHOW_TRANSLATE_DURATION,
                            easing: Easing.out(Easing.cubic)
                        })
                    }
                ]
            };
        }
        return {
            opacity: withTiming(0, {
                duration: HIDE_DURATION,
                easing: Easing.in(Easing.cubic)
            }),
            transform: [
                {
                    translateY: withTiming(ANIMATION_START_Y, {
                        duration: HIDE_TRANSLATE_DURATION,
                        easing: Easing.in(Easing.cubic)
                    })
                }
            ]
        };
    });

    const animatedProps = useAnimatedProps(() => ({
        pointerEvents:
            mode.value !== NewTransactionsBubbleMode.HIDDEN ? ('auto' as const) : ('none' as const)
    }));

    const message =
        labelState === NewTransactionsBubbleMode.MANY
            ? t('history.bubble.many')
            : t('history.bubble.one');

    return (
        <Animated.View
            style={[styles.container({ top: screenHeaderHeight }), animatedStyle]}
            animatedProps={animatedProps}
        >
            <Toast message={message} onPress={onPress} />
        </Animated.View>
    );
};
