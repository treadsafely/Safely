import type {
    QueryKey,
    UseQueryOptions,
    UseSuspenseQueryOptions,
    UseSuspenseQueryResult
} from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

export type SuspenseQueryOptions<
    TQueryFnData = unknown,
    TError = Error,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey
> = UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey> &
    Pick<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'placeholderData'>;

export function useSuspenseQuery<
    TQueryFnData = unknown,
    TError = Error,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey
>(
    options: SuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseSuspenseQueryResult<TData, TError> {
    const result = useQuery(options) as UseSuspenseQueryResult<TData, TError>;

    if (result.data === undefined) {
        if (result.isError) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw result.error;
        }

        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw result.refetch();
    }

    return result;
}
