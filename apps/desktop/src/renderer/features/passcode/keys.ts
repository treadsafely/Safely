import { defineQueryKeys, finalKey } from '@safely/ux';

export const passcodeKeys = defineQueryKeys('passcode', {
    state: finalKey
});

export const lockoutKeys = defineQueryKeys('passcode_lockout', {
    state: finalKey
});
