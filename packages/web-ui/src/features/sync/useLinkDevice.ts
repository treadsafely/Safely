import { useCallback } from 'react';

import {
    SecurityCheckCancelledError,
    useAppContext,
    useConnectAccountToNewDevice,
    useErrorToast
} from '@safely/ux';

export function useLinkDevice(): () => Promise<string | null> {
    const {
        storage: {
            sync: { getSecureEncrypted }
        }
    } = useAppContext();
    const { mutateAsync: connectToNewDevice } = useConnectAccountToNewDevice();
    const errorToast = useErrorToast({});

    return useCallback(async () => {
        using secureEncryptedStorage = getSecureEncrypted();

        try {
            await secureEncryptedStorage.unlock();
        } catch (error) {
            if (!(error instanceof SecurityCheckCancelledError)) {
                errorToast(error);
            }

            return null;
        }

        return await connectToNewDevice({ secureEncryptedStorage }).catch(() => null);
    }, [getSecureEncrypted, connectToNewDevice, errorToast]);
}
