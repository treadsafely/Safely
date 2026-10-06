import {
    deepEqual,
    Navigate,
    useChildMatches,
    useNavigate,
    useRouteContext,
    useSearch
} from '@tanstack/react-router';
import type { FC } from 'react';

import { useHasPortfolio } from '@safely/ux';
import type { MainLocation } from '@safely/web-ui';
import { LogsSection, MainPage } from '@safely/web-ui';

import { toMainLocation, toMainRouteTarget } from './main-location';
import { SecuritySection } from '../features';
import { platform } from '../platform';
import { ROUTE, sSettingsParams } from '../shared';

export const MainScreen: FC = () => {
    const { hasWindowControls, isFullScreen } = useRouteContext({ from: '__root__' });
    const navigate = useNavigate();
    const hasPortfolio = useHasPortfolio();

    const search = useSearch({ from: '/main' });
    const child = useChildMatches({ select: matches => matches[0] });
    const location = toMainLocation({
        path: child?.fullPath ?? ROUTE.main,
        params: sSettingsParams.parse(child?.params ?? {}),
        search
    });

    const onNavigate = (next: MainLocation): void => {
        const isSameView = deepEqual(next.view, location.view);

        void navigate({ ...toMainRouteTarget(next), replace: isSameView });
    };

    const isWalletSectionWithoutPortfolio =
        !hasPortfolio && location.view.kind === 'settings' && location.view.section === 'wallet';

    if (isWalletSectionWithoutPortfolio) {
        return (
            <Navigate to={ROUTE.settings} params={{ section: 'account' }} search={search} replace />
        );
    }

    return (
        <MainPage
            location={location}
            onNavigate={onNavigate}
            hasWindowControls={hasWindowControls}
            isFullScreen={isFullScreen}
            security={<SecuritySection />}
            logs={<LogsSection store={platform.logs} />}
        />
    );
};
