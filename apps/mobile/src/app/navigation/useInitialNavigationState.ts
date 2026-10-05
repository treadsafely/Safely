import type { NavigationContainerProps } from '@react-navigation/native';
import { useRef } from 'react';

import { useHasAccount } from '@safely/ux';

import { useIsAppRestricted } from '@mobile/entities/restrictions';
import { usePasscode } from '@mobile/entities/security';

export function useInitialNavigationState(): NavigationContainerProps['initialState'] {
    const hasAccount = useHasAccount();
    const isRestricted = useIsAppRestricted();
    const { isSet: hasPasscode } = usePasscode();

    const ref = useRef(
        (() => {
            if (isRestricted) {
                return { routes: [{ name: 'RestrictedFlow' as const }] };
            }

            if (hasAccount && !hasPasscode) {
                return {
                    routes: [
                        {
                            name: 'OnboardingPasscodeScreen' as const,
                            params: { source: null, headerType: 'placeholder' }
                        }
                    ]
                };
            }

            if (!hasPasscode || !hasAccount) {
                return { routes: [{ name: 'WelcomeScreen' as const }] };
            }

            return { routes: [{ name: 'TabsNavigator' as const }] };
        })()
    );

    return ref.current;
}
