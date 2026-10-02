import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';

import { useHasAccount } from '@safely/ux';

import { useIsAppRestricted } from '@mobile/entities/restrictions';
import { usePasscode } from '@mobile/entities/security';

import { navigationRef } from './navigationRef';

const ALLOWED_WHEN_RESTRICTED = [
    'RestrictedFlow',
    'PasscodeVerificationScreen',
    'RecoveryConfirmSheet',
    'RecoveryPhraseModal',
    'DestructiveConfirmSheet'
];

export function useRestrictionGuard() {
    const hasAccount = useHasAccount();
    const { isSet: hasPasscode } = usePasscode();
    const isRestricted = useIsAppRestricted();

    const enforce = useCallback(() => {
        if (!navigationRef.isReady()) return;

        const rootState = navigationRef.getRootState();
        const rootRoute = rootState?.routes[rootState.index]?.name;

        if (rootRoute === undefined) return;

        if (isRestricted) {
            if (ALLOWED_WHEN_RESTRICTED.includes(rootRoute)) return;

            navigationRef.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'RestrictedFlow' }]
                })
            );

            return;
        }

        if (rootRoute !== 'RestrictedFlow') return;

        navigationRef.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: hasAccount && hasPasscode ? 'TabsNavigator' : 'WelcomeScreen' }]
            })
        );
    }, [hasAccount, hasPasscode, isRestricted]);

    useEffect(() => {
        enforce();

        return navigationRef.addListener('state', enforce);
    }, [enforce]);

    return enforce;
}
