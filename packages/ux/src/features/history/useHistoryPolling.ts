import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import type { IActivityFilters } from '../../entities';
import { assetKeys, useHistory } from '../../entities';
import { useInterval } from '../../shared';

const POLL_INTERVAL_MS = 3000;

export type UseHistoryPollingParams = {
    filters?: IActivityFilters;
    isEnabled?: boolean;
    onNewActivity: () => void;
};

export function useHistoryPolling(params: UseHistoryPollingParams): void {
    const { filters = {}, isEnabled = true, onNewActivity } = params;

    const client = useQueryClient();
    const { data, refetch } = useHistory(filters);
    const isLoaded = data !== undefined;
    const firstActivityKey = data?.pages[0]?.items[0]?.key;

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
                    const nextKey = result.data?.pages[0]?.items[0]?.key;

                    if (nextKey !== undefined && nextKey !== previousKey) {
                        void client.invalidateQueries({ queryKey: assetKeys.all.toKey() });
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
