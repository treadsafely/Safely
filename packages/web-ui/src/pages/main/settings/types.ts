export const SETTINGS_SECTIONS = [
    'wallet',
    'account',
    'addressBook',
    'security',
    'language',
    'currency',
    'legal',
    'devTools'
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const DEV_TOOLS = ['keychain', 'logs'] as const;

export type DevTool = (typeof DEV_TOOLS)[number];
