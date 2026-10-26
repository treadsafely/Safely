import { RouterProvider } from '@tanstack/react-router';
import type { FC } from 'react';

import { router } from './router';
import { AppLock, QrScanFlow } from '../features';

export type AppProps = {
    hasWindowControls?: boolean;
    isFullScreen?: boolean;
};

export const App: FC<AppProps> = props => {
    const { hasWindowControls, isFullScreen } = props;

    return (
        <AppLock>
            <RouterProvider router={router} context={{ hasWindowControls, isFullScreen }} />
            <QrScanFlow />
        </AppLock>
    );
};
