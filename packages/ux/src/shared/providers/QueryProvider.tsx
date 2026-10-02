import {
    focusManager,
    MutationCache,
    onlineManager,
    QueryCache,
    QueryClient
} from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { FC, PropsWithChildren, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import type { Logger } from '@safely/sync';

import { QueryHydrationProvider } from '../contexts';
import { QUERIES_STALE_TIME, BUSTER_VERSION, CACHE_LIVE_TIME } from '../query-core';

export function createQueryClient(logger: Logger): QueryClient {
    return new QueryClient({
        queryCache: new QueryCache({
            onError: (error, query) => {
                logger.error('[QueryClient] query error', error, 'in', query.queryKey);
            }
        }),
        mutationCache: new MutationCache({
            onError: (error, _vars, _ctx, mutation) => {
                logger.error(
                    '[QueryClient] mutation error',
                    error,
                    'in',
                    mutation.options.mutationKey
                );
            }
        }),
        defaultOptions: {
            queries: {
                networkMode: 'offlineFirst',
                gcTime: CACHE_LIVE_TIME,
                staleTime: QUERIES_STALE_TIME.DEFAULT
            },
            mutations: {
                networkMode: 'offlineFirst'
            }
        }
    });
}

export interface EventListeners {
    onlineManager?: Parameters<typeof onlineManager.setEventListener>[0];
    focusManager?: Parameters<typeof focusManager.setEventListener>[0];
}

export const QueryProvider: FC<
    PropsWithChildren<{
        loader?: ReactNode;
        persister: Persister;
        queryClient: QueryClient;
        /**
         * On web working out-of-box, should be implemented only on RN (and desktop maybe)
         */
        eventListeners?: EventListeners;
    }>
> = ({ children, loader, persister, queryClient, eventListeners }) => {
    const [hydratedAt, setHydratedAt] = useState<number | null>(null);
    const isReady = hydratedAt !== null;

    useEffect(() => {
        if (!isReady) return;

        void queryClient.invalidateQueries({
            predicate: q => Boolean(q.meta?.persist)
        });
    }, [isReady, queryClient]);

    useEffect(() => {
        if (!eventListeners) return;

        if (eventListeners.onlineManager) {
            onlineManager.setEventListener(eventListeners.onlineManager);
        }

        if (eventListeners.focusManager) {
            focusManager.setEventListener(eventListeners.focusManager);
        }
    }, [eventListeners]);

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: CACHE_LIVE_TIME,
                buster: BUSTER_VERSION,
                dehydrateOptions: {
                    shouldDehydrateQuery: query => {
                        if (!query.options.meta?.persist) {
                            return false;
                        }

                        return query.state.status === 'success' || query.state.dataUpdatedAt > 0;
                    }
                }
            }}
            onError={() => setHydratedAt(Date.now())}
            onSuccess={() => setHydratedAt(Date.now())}
        >
            <QueryHydrationProvider value={{ hydratedAt }}>
                {isReady ? children : (loader ?? null)}
            </QueryHydrationProvider>
        </PersistQueryClientProvider>
    );
};
