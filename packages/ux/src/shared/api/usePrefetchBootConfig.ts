import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiKeys } from './keys';
import { useConfigApiFactory } from './useConfigApi';

interface PrefetchBootConfig {
    isCached: (lang: string) => boolean;
    prefetch: (lang: string) => Promise<boolean>;
}

export function usePrefetchBootConfig(): PrefetchBootConfig {
    const queryClient = useQueryClient();
    const createConfigApi = useConfigApiFactory();

    const isCached = useCallback(
        (lang: string): boolean => {
            const queryKey = apiKeys.bootConfig(createConfigApi(lang).id).toKey();

            return queryClient.getQueryData(queryKey) !== undefined;
        },
        [queryClient, createConfigApi]
    );

    const prefetch = useCallback(
        async (lang: string): Promise<boolean> => {
            const configApi = createConfigApi(lang);

            try {
                await queryClient.query({
                    queryKey: apiKeys.bootConfig(configApi.id).toKey(),
                    queryFn: () => configApi.boot(),
                    meta: {
                        persist: true,
                        schemaKey: 'bootConfig'
                    },
                    retry: 1
                });

                return true;
            } catch {
                return false;
            }
        },
        [queryClient, createConfigApi]
    );

    return { isCached, prefetch };
}
