import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSuspenseQuery } from '@safely/ux';

import { lockScreenKeys } from './keys';
import { useDesktopLayerRegularStorage } from '../../shared';

export function useLockScreen() {
    const client = useQueryClient();
    const { get: storageGet, set: storageSet } = useDesktopLayerRegularStorage('lockScreenEnabled');

    const { data: isEnabled } = useSuspenseQuery({
        queryKey: lockScreenKeys.state.toKey(),
        queryFn: async () => (await storageGet()) ?? false,
        staleTime: Infinity
    });

    const { mutateAsync: setEnabled } = useMutation({
        mutationFn: (enabled: boolean) => storageSet(enabled),
        onSuccess: () => client.invalidateQueries({ queryKey: lockScreenKeys.state.toKey() })
    });

    return { isEnabled, setEnabled };
}
