import type { CacheSchemaKey } from './cache-config';

export type WithIsActualised<T> = T & { isActualised: boolean };

export type WithPersistMeta<TOptions> = Omit<TOptions, 'meta'> & { schemaKey: CacheSchemaKey };

export type DerivedQueryResult<TData = unknown, TError = unknown> = {
    data: TData | undefined;
    isError: boolean;
    isSuccess: boolean;
    isPending: boolean;
    isFetching: boolean;
    error: TError | null;
    dataUpdatedAt: number;
    isActualised?: boolean;
    refetch: () => Promise<unknown>;
};
