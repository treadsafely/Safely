import { keepPreviousData } from '@tanstack/react-query';

import type { About, AboutPost } from '@safely/core';

import { apiKeys } from './keys';
import { useConfigApi } from './useConfigApi';
import { useGroupedRows, type GroupedRow } from '../format';
import { usePersistQuery } from '../query-core';

export function getLatestPostTimestamp(about: About | undefined): number | null {
    const timestamps = about?.posts?.map(post => post.timestamp) ?? [];

    return timestamps.length === 0 ? null : Math.max(...timestamps);
}

export function useAboutQuery() {
    const configApi = useConfigApi();

    return usePersistQuery<About>({
        queryKey: apiKeys.about(configApi.id).toKey(),
        queryFn: () => configApi.getAbout(),
        schemaKey: 'about',
        placeholderData: keepPreviousData
    });
}

const getAboutPostKey = (post: AboutPost): string => post.id;
const getAboutPostTimestamp = (post: AboutPost): number => post.timestamp * 1000;
const ABOUT_FEED_ORDER = { order: 'desc' } as const;

export interface AboutFeed {
    rows: GroupedRow<AboutPost>[];
    isLoading: boolean;
    latestTimestamp: number | null;
}

export function useAboutFeedRows(): AboutFeed {
    const { data, isLoading } = useAboutQuery();
    const rows = useGroupedRows(
        data?.posts ?? [],
        getAboutPostTimestamp,
        getAboutPostKey,
        ABOUT_FEED_ORDER
    );

    return { rows, isLoading, latestTimestamp: getLatestPostTimestamp(data) };
}
