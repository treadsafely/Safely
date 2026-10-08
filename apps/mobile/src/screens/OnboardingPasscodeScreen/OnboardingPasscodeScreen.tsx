import type { StaticScreenProps } from '@react-navigation/native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { AccountPortfolioSource } from '@safely/ux';

import { useOnboardingFlow } from '@mobile/features/onboarding';
import type { PasscodeSetupHeaderType } from '@mobile/shared/ui';
import { PasscodeSetup } from '@mobile/shared/ui';

type OnboardingPasscodeScreenProps = StaticScreenProps<{
    source: AccountPortfolioSource | null;
    headerType: PasscodeSetupHeaderType;
}>;

export const OnboardingPasscodeScreen = (props: OnboardingPasscodeScreenProps) => {
    const { t } = useTranslation();
    const { source, headerType } = props.route.params;
    const { onPasscodeReady } = useOnboardingFlow();

    const handleComplete = useCallback(
        (passcode: string) => onPasscodeReady(passcode, source),
        [onPasscodeReady, source]
    );

    return (
        <PasscodeSetup
            headerType={headerType}
            title={t('onboarding.passcode.title')}
            reenterTitle={t('onboarding.passcode.reenter.title')}
            description={t('onboarding.passcode.description')}
            reenterDescription={t('onboarding.passcode.reenter.description')}
            onComplete={handleComplete}
        />
    );
};
