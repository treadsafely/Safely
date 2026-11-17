import { Platform } from 'react-native';

import type { ScreenContextType } from '../../Screen.context';

export function resolveShouldInsetTop(layout: ScreenContextType['layout']): boolean {
    return layout === 'screen' || (layout === 'modal' && Platform.OS === 'android');
}
