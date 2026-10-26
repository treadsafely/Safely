export const PASSCODE_LENGTH = {
    short: 4,
    long: 6
} as const;

export type PasscodeLength = (typeof PASSCODE_LENGTH)[keyof typeof PASSCODE_LENGTH];
