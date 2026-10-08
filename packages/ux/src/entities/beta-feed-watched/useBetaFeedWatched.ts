import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { About } from '@safely/core';

import { betaFeedWatchedKeys } from './keys';
import { useAboutQuery, useSharedUxStorage } from '../../shared';

export type MarkWatchedResult = { hadUnread: false } | { hadUnread: true; latestTimestamp: number };

export interface BetaFeedWatched {
    shouldShowBadge: boolean;
    markWatched: () => Promise<MarkWatchedResult>;
}

const getLatestTimestamp = (about: About | undefined) => about?.posts?.at(-1)?.timestamp ?? null;

export function useBetaFeedWatched(): BetaFeedWatched {
    const queryClient = useQueryClient();
    const { get, set } = useSharedUxStorage('watchedBetaTimestamp');
    const { data: aboutData, refetch } = useAboutQuery();
    const { data: stored } = useQuery({
        queryKey: betaFeedWatchedKeys.timestamp.toKey(),
        queryFn: async () => (await get()) ?? null,
        staleTime: Infinity
    });

    const latestTimestamp = useMemo(() => getLatestTimestamp(aboutData), [aboutData]);

    const shouldShowBadge = useMemo<boolean>(() => {
        if (latestTimestamp === null) return false;
        if (stored === undefined) return false;

        if (stored === null) return true;

        return stored < latestTimestamp;
    }, [latestTimestamp, stored]);

    const markWatched = useCallback(async (): Promise<MarkWatchedResult> => {
        const { data } = await refetch();
        const latest = getLatestTimestamp(data) ?? latestTimestamp;
        if (latest === null) return { hadUnread: false };

        const watched = (await get()) ?? null;
        await set(latest);
        queryClient.setQueryData(betaFeedWatchedKeys.timestamp.toKey(), latest);

        const hadUnread = watched === null || watched < latest;

        return hadUnread ? { hadUnread, latestTimestamp: latest } : { hadUnread };
    }, [refetch, latestTimestamp, get, set, queryClient]);

    return { shouldShowBadge, markWatched };
}
