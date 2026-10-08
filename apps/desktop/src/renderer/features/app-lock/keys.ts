import { defineQueryKeys, finalKey } from '@safely/ux';

export const lockScreenKeys = defineQueryKeys('lock_screen', {
    state: finalKey
});
