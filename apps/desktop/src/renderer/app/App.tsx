import { RouterProvider } from '@tanstack/react-router';
import type { FC } from 'react';

import type { WindowControls } from '@safely/web-ui';

import { router } from './router';
import { AppLock, QrScanFlow } from '../features';

export type AppProps = {
    windowControls?: WindowControls;
    isFullScreen?: boolean;
};

export const App: FC<AppProps> = props => {
    const { windowControls, isFullScreen } = props;

    return (
        <AppLock>
            <RouterProvider router={router} context={{ windowControls, isFullScreen }} />
            <QrScanFlow />
        </AppLock>
    );
};
