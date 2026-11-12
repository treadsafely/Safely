import { useMemo } from 'react';
import {
    Extrapolation,
    interpolate,
    useDerivedValue,
    useSharedValue
} from 'react-native-reanimated';

import { useScreenHeaderHeight } from '@mobile/shared/ui';

const FADE_DISTANCE = 64;
const TOP_THRESHOLD = 44;

export function useHistoryScroll() {
    const screenHeaderHeight = useScreenHeaderHeight();
    const scrollY = useSharedValue(0);
    const listHeaderHeight = useSharedValue(0);
    const fadeProgress = useDerivedValue(() =>
        interpolate(scrollY.value, [0, FADE_DISTANCE], [0, 1], Extrapolation.CLAMP)
    );
    const isAtTop = useDerivedValue(() => {
        const firstRowOffsetBelowHeader = Math.max(listHeaderHeight.value - screenHeaderHeight, 0);
        return scrollY.value <= firstRowOffsetBelowHeader + TOP_THRESHOLD;
    });

    return useMemo(
        () => ({ scrollY, listHeaderHeight, fadeProgress, isAtTop }),
        [scrollY, listHeaderHeight, fadeProgress, isAtTop]
    );
}

export type HistoryScroll = ReturnType<typeof useHistoryScroll>;
