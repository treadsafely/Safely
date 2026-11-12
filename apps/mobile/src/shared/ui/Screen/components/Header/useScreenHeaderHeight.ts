import { useUnistyles } from 'react-native-unistyles';

import { HEADER_HEIGHT } from './Header.styles';
import { resolveShouldInsetTop } from './Header.utils';
import { useScreenContext } from '../../Screen.context';

export function useScreenHeaderHeight(): number {
    const { rt } = useUnistyles();
    const { layout } = useScreenContext();

    return (resolveShouldInsetTop(layout) ? rt.insets.top : 0) + HEADER_HEIGHT;
}
