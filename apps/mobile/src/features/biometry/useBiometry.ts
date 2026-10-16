import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as LocalAuthentication from 'expo-local-authentication';

import { useMobileLayerRegularStorage } from '@mobile/shared/storage';
import { blurFreeze } from '@mobile/shared/utils';

import { biometryKeys } from './keys';

async function authenticateWithBlurFreeze(): Promise<LocalAuthentication.LocalAuthenticationResult> {
    blurFreeze.freeze();
    try {
        /* the device passcode would unlock every gate in the app, so only ours may serve as fallback */
        return await LocalAuthentication.authenticateAsync({ disableDeviceFallback: true });
    } finally {
        blurFreeze.unfreeze();
    }
}

export enum BiometryType {
    FACE = 'face',
    FINGERPRINT = 'fingerprint',
    IRIS = 'iris'
}

function resolveType(types: LocalAuthentication.AuthenticationType[]): BiometryType | null {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION))
        return BiometryType.FACE;
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))
        return BiometryType.FINGERPRINT;
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return BiometryType.IRIS;
    return null;
}

async function getAvailableBiometryType(): Promise<BiometryType | null> {
    const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync()
    ]);
    const type = resolveType(supportedTypes);

    if (type !== null && hasHardware && isEnrolled) {
        return type;
    } else {
        return null;
    }
}

export function useBiometryQuery() {
    const { get: storageGet } = useMobileLayerRegularStorage('biometryEnabled');

    return useQuery({
        queryKey: biometryKeys.state.toKey(),
        queryFn: async () => {
            const availableType = await getAvailableBiometryType();
            const isEnabled = availableType !== null ? Boolean(await storageGet()) : false;
            return { availableType, isEnabled };
        },
        staleTime: Infinity
    });
}

export function useSetBiometryEnabled() {
    const queryClient = useQueryClient();
    const { set: storageSet } = useMobileLayerRegularStorage('biometryEnabled');

    return useMutation({
        /* proving the factor works is part of turning it on; giving it up is authorized by the caller */
        mutationFn: async (enabled: boolean) => {
            if (enabled) {
                const result = await authenticateWithBlurFreeze();
                if (!result.success) {
                    throw new Error('Authentication failed');
                }
            }
            await storageSet(enabled);
        },
        async onSuccess() {
            await queryClient.invalidateQueries({ queryKey: biometryKeys.state.toKey() });
        }
    });
}

export async function authenticateBiometry() {
    try {
        const result = await authenticateWithBlurFreeze();
        if (result.success) {
            return { success: true } as const;
        }
        return { success: false, error: result.error } as const;
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        } as const;
    }
}
