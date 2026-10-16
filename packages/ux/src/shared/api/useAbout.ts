import { keepPreviousData } from '@tanstack/react-query';

import type { About, AboutOrder } from '@safely/core';

import { apiKeys } from './keys';
import { useConfigApi } from './useConfigApi';
import { usePersistQuery } from '../query-core';

export function getLatestPostTimestamp(about: About | undefined): number | null {
    const timestamps = about?.posts?.map(post => post.timestamp) ?? [];

    return timestamps.length === 0 ? null : Math.max(...timestamps);
}

export function useAboutQuery(order: AboutOrder = 'asc') {
    const configApi = useConfigApi();

    return usePersistQuery<About>({
        queryKey: apiKeys.about(configApi.id, order).toKey(),
        queryFn: () => configApi.getAbout(order),
        schemaKey: 'about',
        placeholderData: keepPreviousData
    });
}
