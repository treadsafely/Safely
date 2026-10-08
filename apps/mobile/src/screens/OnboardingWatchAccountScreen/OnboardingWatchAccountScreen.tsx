import { useCallback } from 'react';

import { PortfolioNetworkType } from '@safely/core';

import { WatchOnlyAddressForm } from '@mobile/features/add-wallet';
import { useOnboardingFlow } from '@mobile/features/onboarding';

export const OnboardingWatchAccountScreen = () => {
    const { onWatchOnlyReady } = useOnboardingFlow();

    const handleSubmit = useCallback(
        (input: string) => {
            onWatchOnlyReady(input, PortfolioNetworkType.MAINNET);
        },
        [onWatchOnlyReady]
    );

    return (
        <WatchOnlyAddressForm networkType={PortfolioNetworkType.MAINNET} onSubmit={handleSubmit} />
    );
};
