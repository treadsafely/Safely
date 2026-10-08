import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qrScanKeys } from './keys';
import { useDesktopLayerRegularStorage } from '../../shared';

/* `null` means automatic: Chromium's own default, which is also what an id that no longer exists
   falls back to — the salt behind `deviceId` changes with the renderer origin. */
export function useQrScanDeviceId() {
    const client = useQueryClient();
    const { get, set } = useDesktopLayerRegularStorage('qrScanDeviceId');

    const query = useQuery({
        queryKey: qrScanKeys.deviceId.toKey(),
        queryFn: () => get(),
        staleTime: Infinity
    });

    const { mutate: select } = useMutation({
        mutationFn: (deviceId: string | null) => set(deviceId),
        /* the preview switches on the click, not on the store write it does not depend on */
        onMutate: (deviceId: string | null) =>
            client.setQueryData(qrScanKeys.deviceId.toKey(), deviceId),
        onSettled: () => client.invalidateQueries({ queryKey: qrScanKeys.deviceId.toKey() })
    });

    return { deviceId: query.data ?? null, isLoaded: query.isSuccess, select };
}
