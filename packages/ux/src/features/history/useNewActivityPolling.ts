import type { QueryKey } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useInterval } from '../../shared';

const POLL_INTERVAL_MS = 3000;

export type NewActivityPollingParams = {
    isEnabled?: boolean;
    onNewActivity: () => void;
};

export function useNewActivityPolling<TData>(
    query: { data: TData | undefined; refetch: () => Promise<{ data?: TData }> },
    firstKeyOf: (data: TData) => string | undefined,
    params: NewActivityPollingParams & { invalidateOnNew: QueryKey }
): void {
    const { isEnabled = true, onNewActivity, invalidateOnNew } = params;
    const { data, refetch } = query;

    const client = useQueryClient();
    const isLoaded = data !== undefined;
    const firstActivityKey = data === undefined ? undefined : firstKeyOf(data);

    const isRefetching = useRef(false);
    const latest = useRef({ isLoaded, firstActivityKey, onNewActivity });

    useEffect(() => {
        latest.current = { isLoaded, firstActivityKey, onNewActivity };
    });

    useInterval(
        () => {
            if (isRefetching.current || !latest.current.isLoaded) {
                return;
            }

            isRefetching.current = true;
            const previousKey = latest.current.firstActivityKey;

            void refetch()
                .then(result => {
                    const nextKey = result.data === undefined ? undefined : firstKeyOf(result.data);

                    if (nextKey !== undefined && nextKey !== previousKey) {
                        void client.invalidateQueries({ queryKey: invalidateOnNew });
                        latest.current.onNewActivity();
                    }
                })
                .catch(() => undefined)
                .finally(() => {
                    isRefetching.current = false;
                });
        },
        isEnabled ? POLL_INTERVAL_MS : null
    );
}
