import { useMutation } from '@tanstack/react-query';

import {
    useAccountStore,
    useActiveAccount,
    useActiveAccountSyncStorageSlotUpdate
} from '../../entities';

const DEFAULT_CHART_COLLAPSED = false;

export function useChartCollapsed(): boolean {
    const account = useActiveAccount();

    return useAccountStore(
        state =>
            state.accountsData.get(account.accountId)?.chart?.collapsed ?? DEFAULT_CHART_COLLAPSED
    );
}

export function useSetChartCollapsed() {
    const update = useActiveAccountSyncStorageSlotUpdate('chart');

    return useMutation({
        mutationFn: (isCollapsed: boolean) => update(draft => draft.set('collapsed', isCollapsed))
    });
}
