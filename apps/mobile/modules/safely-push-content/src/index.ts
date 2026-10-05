import { requireNativeModule } from 'expo-modules-core';

interface SafelyPushContentNativeModule {
    setWalletNames(names: Record<string, string>): Promise<void>;
}

const native = requireNativeModule<SafelyPushContentNativeModule>('SafelyPushContent');

export function setWalletNames(names: Record<string, string>): Promise<void> {
    return native.setWalletNames(names);
}
