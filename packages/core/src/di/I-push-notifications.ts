export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface IPushNotifications {
    getPermissionStatus(): Promise<PushPermissionStatus>;
    requestPermission(): Promise<PushPermissionStatus>;
    getPushToken(): Promise<string>;
    openSystemSettings(): void;
    setWalletNames(names: Record<string, string>): Promise<void>;
}
