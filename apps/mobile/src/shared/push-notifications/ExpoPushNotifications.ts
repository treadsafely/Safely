import { createURL } from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { IPushNotifications, PushPermissionStatus } from '@safely/core';

import { setWalletNames } from '../../../modules/safely-push-content/src';

const ANDROID_CHANNEL_ID = 'default';

function toPermissionStatus(status: Notifications.PermissionStatus): PushPermissionStatus {
    switch (status) {
        case Notifications.PermissionStatus.GRANTED:
            return 'granted';
        case Notifications.PermissionStatus.DENIED:
            return 'denied';
        default:
            return 'undetermined';
    }
}

export class ExpoPushNotifications implements IPushNotifications {
    public static configureForegroundPresentation(): void {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false
            })
        });
    }

    public static openTappedNotificationUrls(): void {
        const openUrl = (response: Notifications.NotificationResponse | null) => {
            const url = response?.notification.request.content.data?.url;

            if (typeof url === 'string' && url.startsWith(createURL('/'))) {
                void Linking.openURL(url);
            }
        };

        openUrl(Notifications.getLastNotificationResponse());
        Notifications.addNotificationResponseReceivedListener(openUrl);
    }

    public async getPermissionStatus(): Promise<PushPermissionStatus> {
        const { status } = await Notifications.getPermissionsAsync();

        return toPermissionStatus(status);
    }

    public async requestPermission(): Promise<PushPermissionStatus> {
        const { status } = await Notifications.requestPermissionsAsync();

        return toPermissionStatus(status);
    }

    public async getPushToken(): Promise<string> {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
                name: ANDROID_CHANNEL_ID,
                importance: Notifications.AndroidImportance.MAX
            });
        }

        const { data } = await Notifications.getExpoPushTokenAsync();

        return data;
    }

    public openSystemSettings(): void {
        void Linking.openSettings();
    }

    public setWalletNames(names: Record<string, string>): Promise<void> {
        return setWalletNames(names);
    }
}
