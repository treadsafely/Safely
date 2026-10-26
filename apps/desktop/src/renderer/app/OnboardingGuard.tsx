import { Navigate, Outlet, useLocation } from '@tanstack/react-router';
import type { FC } from 'react';

import { useHasAccount } from '@safely/ux';

import { usePasscode } from '../features';
import { ROUTE } from '../shared';

export const OnboardingGuard: FC = () => {
    const hasAccount = useHasAccount();
    const { isSet: hasPasscode } = usePasscode();
    const { pathname } = useLocation();

    const isOnboarded = hasAccount && hasPasscode;
    const isOnboardingRoute = pathname.startsWith(ROUTE.onboarding.welcome);

    if (!isOnboarded && !isOnboardingRoute) {
        return <Navigate to={ROUTE.onboarding.welcome} replace />;
    }

    return <Outlet />;
};
