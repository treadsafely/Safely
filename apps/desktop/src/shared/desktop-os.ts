export type DesktopOs = 'darwin' | 'win32' | 'other';

export const desktopOsOf = (platform: string): DesktopOs =>
    platform === 'darwin' || platform === 'win32' ? platform : 'other';
