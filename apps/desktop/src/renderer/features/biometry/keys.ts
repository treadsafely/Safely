import { defineQueryKeys, finalKey } from '@safely/ux';

export const biometryKeys = defineQueryKeys('biometry', {
    state: finalKey
});
