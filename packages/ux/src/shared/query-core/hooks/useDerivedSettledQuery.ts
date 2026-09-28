import { useMemo } from 'react';

import { allActualised, minUpdatedAt, useRefetchAll } from '../derived-helpers';
import type { DerivedQueryResult } from '../types';

type SettledStatus = 'pending' | 'fulfilled' | 'rejected';

type QuerySnapshot<T> =
    | { status: 'pending' }
    | { status: 'fulfilled'; data: T }
    | { status: 'rejected'; error: unknown };

type SnapshotTuple<Qs extends readonly DerivedQueryResult[]> = {
    [K in keyof Qs]: Qs[K] extends DerivedQueryResult<infer T> ? QuerySnapshot<T> : never;
};

type DerivedSettledQueryResult<TData = unknown, TError = unknown> = DerivedQueryResult<
    TData,
    TError
> & {
    settledStatuses: SettledStatus[];
};

export function useDerivedSettledQuery<const Qs extends readonly DerivedQueryResult[], TData>({
    queries,
    queryFn,
    isQueryFnReactive = false
}: {
    queries: Qs;
    queryFn: (snapshots: SnapshotTuple<Qs>) => TData;
    isQueryFnReactive?: boolean;
}): DerivedSettledQueryResult<TData> {
    const settledStatuses = queries.map<SettledStatus>(query => {
        if (query.isPending) return 'pending';
        if (query.isSuccess) return 'fulfilled';

        return 'rejected';
    });

    const hasFulfilled = settledStatuses.some(status => status === 'fulfilled');
    const isPending = !hasFulfilled && queries.some(q => q.isPending);
    const isFetching = queries.some(q => q.isFetching);
    const dataUpdatedAt = minUpdatedAt(queries);
    const isActualised = allActualised(queries);
    const firstError = queries.find(q => q.error)?.error ?? null;

    const snapshotDeps = queries.flatMap(q => [q.isPending, q.isSuccess, q.data, q.error]);
    const snapshots = useMemo(() => {
        return queries.map<QuerySnapshot<unknown>>(q => {
            if (q.isPending) return { status: 'pending' };
            if (q.isSuccess) return { status: 'fulfilled', data: q.data };

            return { status: 'rejected', error: q.error };
        }) as SnapshotTuple<Qs>;
    }, snapshotDeps);

    const data = useMemo(() => {
        if (isPending) return undefined;
        return queryFn(snapshots);
    }, [isPending, snapshots, isQueryFnReactive ? queryFn : null]);

    const refetch = useRefetchAll(queries) as () => Promise<unknown[]>;

    return useMemo(
        () => ({
            data,
            isError: !hasFulfilled,
            isSuccess: hasFulfilled,
            isPending,
            isFetching,
            error: hasFulfilled ? null : firstError,
            dataUpdatedAt,
            isActualised,
            refetch,
            settledStatuses
        }),
        [
            data,
            hasFulfilled,
            isPending,
            isFetching,
            firstError,
            dataUpdatedAt,
            isActualised,
            refetch,
            settledStatuses
        ]
    );
}
