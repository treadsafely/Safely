import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSuspenseQuery } from '@safely/ux';

import { useBiometryPrompt } from './BiometryPrompt.context';
import { biometryKeys } from './keys';
import { platform } from '../../platform';
import { desktopLayerEncryptedStorage, useDesktopLayerEncryptedStorage } from '../../shared';

export function isBiometryAvailable(): Promise<boolean> {
    return platform.biometry.isAvailable();
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

function useBiometryStateQueryOptions() {
    const { get: storageGet, set: storageSet } = useDesktopLayerEncryptedStorage('biometryEnabled');

    return {
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
    };
}

export function useBiometryQuery() {
    return useQuery(useBiometryStateQueryOptions());
}

export function useSuspenseBiometryQuery() {
    return useSuspenseQuery(useBiometryStateQueryOptions());
}

export function useSetBiometryEnabled() {
    const client = useQueryClient();
    const prompt = useBiometryPrompt();
    const { set: storageSet } = useDesktopLayerEncryptedStorage('biometryEnabled');

    return useMutation({
        /* proving the factor works is part of turning it on; giving it up is authorized by the caller */
        mutationFn: async (enabled: boolean) => {
            if (enabled && !(await prompt.authenticate())) {
                throw new Error('Biometric authentication failed');
            }

            await storageSet(enabled);
        },
        onSuccess: () => client.invalidateQueries({ queryKey: biometryKeys.state.toKey() })
    });
}
