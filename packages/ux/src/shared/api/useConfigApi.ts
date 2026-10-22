import { useCallback, useMemo } from 'react';

import { ConfigApi } from '@safely/core';

import { useUserCountryInfo } from './useUserCountryInfo';
import { useAppContext } from '../providers';

export function useConfigApiFactory(): (lang: string) => ConfigApi {
    const { version, build, devToken, logger } = useAppContext();
    const userCountryInfo = useUserCountryInfo();

    return useCallback(
        (lang: string) =>
            new ConfigApi(
                {
                    build,
                    version,
                    lang,
                    userCountryInfo,
                    devToken
                },
                logger
            ),
        [build, version, userCountryInfo, devToken, logger]
    );
}

export function useConfigApi(): ConfigApi {
    const { i18n } = useAppContext();
    const createConfigApi = useConfigApiFactory();

    return useMemo(() => createConfigApi(i18n.language), [createConfigApi, i18n.language]);
}
