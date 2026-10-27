import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { DehydratedState, InfiniteData } from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';

import type { IStorage } from '@safely/core';
import type { Logger } from '@safely/sync';

import { cacheSchemas, isValidSchemaKey, persistSanitizers } from './cache-config';
import { serialize, deserialize } from './serialization';

type DehydratedQuery = DehydratedState['queries'][number];

function clearQueryState(query: DehydratedQuery) {
    if (!query.state) return;

    query.state.data = undefined;
    query.state.status = 'pending';
    query.state.fetchStatus = 'idle';
}

function isInfiniteData(data: unknown): data is InfiniteData<unknown, unknown> {
    return (
        data !== null &&
        typeof data === 'object' &&
        'pages' in data &&
        'pageParams' in data &&
        Array.isArray((data as InfiniteData<unknown, unknown>).pages)
    );
}

function validateQuery(query: DehydratedQuery, logger: Logger): void {
    const schemaKey = query.meta?.schemaKey;

    if (!query.state?.data) return;
    if (!schemaKey || typeof schemaKey !== 'string') return;

    if (!isValidSchemaKey(schemaKey)) {
        logger.warn('unknown schema key', schemaKey);
        clearQueryState(query);

        return;
    }

    const schema = cacheSchemas[schemaKey];
    const result = schema.safeParse(query.state.data);

    if (result.success) {
        query.state.data = result.data;
    } else {
        logger.warn('cache validation failed for', query.queryKey, result.error);
        clearQueryState(query);
    }
}

function sanitizeForDisk(queries: DehydratedQuery[]): DehydratedQuery[] {
    return queries.flatMap(query => {
        const schemaKey = query.meta?.schemaKey;
        if (typeof schemaKey !== 'string' || !isValidSchemaKey(schemaKey)) return [query];

        const sanitize = persistSanitizers[schemaKey];
        if (!sanitize || query.state?.data === undefined) return [query];

        const data = sanitize(query.state.data);

        return data === undefined ? [] : [{ ...query, state: { ...query.state, data } }];
    });
}

function keepOnlyFirstInfinityPage(queries: DehydratedQuery[]) {
    for (const query of queries) {
        const data = query.state?.data;
        if (!isInfiniteData(data) || data.pages.length < 2) continue;

        query.state = {
            ...query.state,
            data: {
                pages: [data.pages[0]],
                pageParams: [data.pageParams[0]]
            }
        };
    }
}

export function createPersister(storage: IStorage, logger: Logger): Persister {
    const persistenceLogger = logger.child('persistence');
    const basePersister = createAsyncStoragePersister({
        storage,
        serialize,
        deserialize
    });

    return {
        ...basePersister,
        persistClient: async client => {
            const queries = client.clientState?.queries;

            if (!queries?.length) {
                return basePersister.persistClient(client);
            }

            keepOnlyFirstInfinityPage(queries);

            return basePersister.persistClient({
                ...client,
                clientState: { ...client.clientState, queries: sanitizeForDisk(queries) }
            });
        },
        restoreClient: async () => {
            const restored = await basePersister.restoreClient();
            if (!restored) return undefined;

            const queries = restored.clientState?.queries;

            if (queries?.length) {
                queries.forEach(query => {
                    validateQuery(query, persistenceLogger);
                });
            }

            return restored;
        }
    };
}
