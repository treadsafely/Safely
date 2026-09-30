import { defineQueryKeys, finalKey } from '../../shared';

export const notificationsKeys = defineQueryKeys('notifications', {
    permission: finalKey,
    pushEnabled: finalKey,
    newsEnabled: finalKey
});
