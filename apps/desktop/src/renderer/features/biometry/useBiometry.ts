import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { biometryKeys } from './keys';
import { i18n } from '../../i18n';
import { platform } from '../../platform';
import { desktopLayerEncryptedStorage, useDesktopLayerEncryptedStorage } from '../../shared';

export function isBiometryAvailable(): Promise<boolean> {
    return platform.biometry.isAvailable();
}

let isPromptOpen = false;

/* the prompt costs the app its active state, and a lock raised by that would cover the prompt itself */
export function isBiometryPromptOpen(): boolean {
    return isPromptOpen;
}

export async function authenticateBiometry(): Promise<boolean> {
    isPromptOpen = true;

    try {
        return await platform.biometry.authenticate(i18n.t('biometry.reason'));
    } finally {
        isPromptOpen = false;
    }
}

/* the security gate runs outside React, so this path takes the storage without the hook */
export async function isBiometryUnlockEnabled(): Promise<boolean> {
    const [isAvailable, isEnabled] = await Promise.all([
        platform.biometry.isAvailable(),
        desktopLayerEncryptedStorage.get('biometryEnabled')
    ]);

    if (!isAvailable && isEnabled === true) {
        await desktopLayerEncryptedStorage.set('biometryEnabled', false);

        return false;
    }

    return isAvailable && isEnabled === true;
}

/* deliberately not suspending: an availability round-trip must not blank the app it renders inside */
export function useBiometryQuery() {
    const { get: storageGet, set: storageSet } = useDesktopLayerEncryptedStorage('biometryEnabled');

    return useQuery({
        queryKey: biometryKeys.state.toKey(),
        queryFn: async () => {
            const isAvailable = await platform.biometry.isAvailable();
            const wasEnabled = (await storageGet()) === true;

            if (!isAvailable && wasEnabled) {
                await storageSet(false);

                return { isAvailable, isEnabled: false };
            }

            return { isAvailable, isEnabled: isAvailable && wasEnabled };
        },
        staleTime: Infinity
    });
}

export function useSetBiometryEnabled() {
    const client = useQueryClient();
    const { set: storageSet } = useDesktopLayerEncryptedStorage('biometryEnabled');

    return useMutation({
        /* proving the factor works is part of turning it on; giving it up is authorized by the caller */
        mutationFn: async (enabled: boolean) => {
            if (enabled && !(await authenticateBiometry())) {
                throw new Error('Biometric authentication failed');
            }

            await storageSet(enabled);
        },
        onSuccess: () => client.invalidateQueries({ queryKey: biometryKeys.state.toKey() })
    });
}
