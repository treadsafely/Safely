import type { IPushNotifications } from '@safely/core';

/* Capabilities this app does not have yet. They fail loudly rather than being absent, and they live
   here rather than in `@safely/web-ui` because what is missing is a property of the target: the
   extension will lack a different set and must not inherit ours. */

/* TODO(push): no push pipeline on the desktop yet; the permission reads as denied, a token throws. */
export const unsupportedPushNotifications: IPushNotifications = {
    getPermissionStatus: () => Promise.resolve('denied'),
    requestPermission: () => Promise.resolve('denied'),
    getPushToken: () =>
        Promise.reject(new Error('Push notifications are not available on the desktop app yet')),
    openSystemSettings: () => undefined,
    setWalletNames: () => Promise.resolve()
};
