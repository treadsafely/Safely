import { useMemo } from 'react';

import { NotificationsApi } from '@safely/core';

import { useBootConfig } from './useBootConfig';
import { useAppContext } from '../providers';

export function useNotificationsApi(): NotificationsApi | null {
    const { logger } = useAppContext();
    const { notifications } = useBootConfig();
    const baseUrl = notifications?.bitcoin.mainnet.api_url;

    return useMemo(
        () => (baseUrl ? new NotificationsApi({ baseUrl, logger }) : null),
        [baseUrl, logger]
    );
}
