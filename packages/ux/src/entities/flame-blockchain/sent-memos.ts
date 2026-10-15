import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useActiveAccountLocalStorage, useActiveAccountQueryKey } from '../account';

// The memo is sealed to the recipient's view key, so the sender can only keep its own copy
export function useFlameSentMemos() {
    const { get } = useActiveAccountLocalStorage('flameSentMemos');
    const accountQueryKey = useActiveAccountQueryKey();

    return useQuery({
        queryKey: accountQueryKey.flameSentMemos.toKey(),
        queryFn: get,
        staleTime: Infinity
    });
}

export function useSaveFlameSentMemo() {
    const { get, set } = useActiveAccountLocalStorage('flameSentMemos');
    const accountQueryKey = useActiveAccountQueryKey();
    const queryClient = useQueryClient();

    return useCallback(
        async (txid: string, memo: string) => {
            await set({ ...(await get()), [txid]: memo });
            await queryClient.invalidateQueries({
                queryKey: accountQueryKey.flameSentMemos.toKey()
            });
        },
        [get, set, accountQueryKey, queryClient]
    );
}
