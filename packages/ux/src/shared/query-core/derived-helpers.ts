import { useCallback } from 'react';

import type { DerivedQueryResult } from './types';

export function aggregateFlags(queries: readonly DerivedQueryResult[]) {
    const isError = queries.some(q => q.isError);
    const isSuccess = queries.every(q => q.isSuccess);
    const isPending = queries.some(q => q.isPending);
    const isFetching = queries.some(q => q.isFetching);
    const error = queries.find(q => q.error)?.error ?? null;

    return { isError, isSuccess, isPending, isFetching, error };
}

export const minUpdatedAt = (queries: readonly DerivedQueryResult[]) => {
    const updatedAts = queries.map(q => q.dataUpdatedAt).filter(Boolean);

    return updatedAts.length > 0 ? Math.min(...updatedAts) : 0;
};

export const allActualised = (queries: readonly DerivedQueryResult[]) =>
    queries.every(q => q.isActualised !== false);

export const useRefetchAll = (queries: readonly DerivedQueryResult[]) =>
    useCallback(() => Promise.all(queries.map(q => q.refetch())), [...queries]);
