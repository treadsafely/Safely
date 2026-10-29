import { describe, expect, it } from 'vitest';

import { resolveStartRoute } from '@mobile/shared/navigation/start-route';

describe('resolveStartRoute', () => {
    it('sends a restricted app to the restricted flow whatever else is set', () => {
        expect(
            resolveStartRoute({ isRestricted: true, hasAccount: true, hasPasscode: true }).name
        ).toBe('RestrictedFlow');
    });

    it('sends an account without a passcode to passcode setup', () => {
        expect(
            resolveStartRoute({ isRestricted: false, hasAccount: true, hasPasscode: false })
        ).toEqual({
            name: 'OnboardingPasscodeScreen',
            params: { source: null, headerType: 'placeholder' }
        });
    });

    it('sends a missing account to the welcome screen, passcode or not', () => {
        expect(
            resolveStartRoute({ isRestricted: false, hasAccount: false, hasPasscode: false }).name
        ).toBe('WelcomeScreen');
        expect(
            resolveStartRoute({ isRestricted: false, hasAccount: false, hasPasscode: true }).name
        ).toBe('WelcomeScreen');
    });

    it('sends a set-up app to the tabs', () => {
        expect(
            resolveStartRoute({ isRestricted: false, hasAccount: true, hasPasscode: true }).name
        ).toBe('TabsNavigator');
    });
});
