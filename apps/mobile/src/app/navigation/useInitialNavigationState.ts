import type { NavigationContainerProps } from '@react-navigation/native';
import { useRef } from 'react';

import { useHasAccount } from '@safely/ux';

import { useIsAppRestricted } from '@mobile/entities/restrictions';
import { usePasscode } from '@mobile/entities/security';
import { resolveStartRoute } from '@mobile/shared/navigation';

export function useInitialNavigationState(): NavigationContainerProps['initialState'] {
    const hasAccount = useHasAccount();
    const isRestricted = useIsAppRestricted();
    const { isSet: hasPasscode } = usePasscode();

    const ref = useRef({ routes: [resolveStartRoute({ isRestricted, hasAccount, hasPasscode })] });

    return ref.current;
}
