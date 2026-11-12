import { type RefObject, useCallback } from 'react';
import { type SharedValue, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';

import type { ListRef } from '@mobile/shared/ui/Screen/components/List';

import type { HistoryScroll } from '../../hooks';

export enum NewTransactionsBubbleMode {
    HIDDEN = 0,
    ONE = 1,
    MANY = 2
}

type UseNewTransactionsBubbleOptions = {
    listRef: RefObject<Pick<ListRef<unknown>, 'scrollToOffset'> | null>;
    scroll: HistoryScroll;
};

type UseNewTransactionsBubbleReturn = {
    mode: SharedValue<NewTransactionsBubbleMode>;
    onPress: () => void;
    show: () => void;
};

export function useNewTransactionsBubble(
    options: UseNewTransactionsBubbleOptions
): UseNewTransactionsBubbleReturn {
    const { listRef, scroll } = options;

    const mode = useSharedValue<NewTransactionsBubbleMode>(NewTransactionsBubbleMode.HIDDEN);

    useAnimatedReaction(
        () => scroll.isAtTop.value,
        isAtTop => {
            if (isAtTop && mode.value !== NewTransactionsBubbleMode.HIDDEN) {
                mode.value = NewTransactionsBubbleMode.HIDDEN;
            }
        }
    );

    const show = useCallback(() => {
        if (scroll.isAtTop.value) {
            return;
        }

        switch (mode.value) {
            case NewTransactionsBubbleMode.HIDDEN:
                mode.value = NewTransactionsBubbleMode.ONE;
                break;
            case NewTransactionsBubbleMode.ONE:
                mode.value = NewTransactionsBubbleMode.MANY;
                break;
        }
    }, [scroll, mode]);

    const onPress = useCallback(() => {
        mode.value = NewTransactionsBubbleMode.HIDDEN;
        listRef.current?.scrollToOffset({ offset: 0, animated: true, viewPosition: 0 });
    }, [mode, listRef]);

    return {
        mode,
        onPress,
        show
    };
}
