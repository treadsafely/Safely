export const PASSCODE_SETUP_ROUTE = {
    name: 'OnboardingPasscodeScreen',
    params: { source: null, headerType: 'placeholder' }
} as const;

export type StartRouteConditions = {
    isRestricted: boolean;
    hasAccount: boolean;
    hasPasscode: boolean;
};

export function resolveStartRoute({ isRestricted, hasAccount, hasPasscode }: StartRouteConditions) {
    if (isRestricted) {
        return { name: 'RestrictedFlow' as const };
    }

    if (hasAccount && !hasPasscode) {
        return PASSCODE_SETUP_ROUTE;
    }

    if (!hasPasscode || !hasAccount) {
        return { name: 'WelcomeScreen' as const };
    }

    return { name: 'TabsNavigator' as const };
}
