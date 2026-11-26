import { z } from 'zod';

import type { Build } from '@safely/core';

import { desktopOsOf, type DesktopOs } from './desktop-os';

const sDesktopBuild = z.enum(['macos', 'windows']) satisfies z.ZodType<Build>;
export type DesktopBuild = z.infer<typeof sDesktopBuild>;

const DESKTOP_BUILDS: Record<DesktopOs, DesktopBuild | null> = {
    darwin: 'macos',
    win32: 'windows',
    other: null
};

export function desktopBuildOf(platform: string): DesktopBuild {
    const build = DESKTOP_BUILDS[desktopOsOf(platform)];

    if (build === null) {
        throw new Error(`No desktop build is defined for ${platform}`);
    }

    return build;
}

export const sAppInfo = z.object({
    version: z.string(),
    build: sDesktopBuild,
    environment: z.enum(['production', 'development']),
    deviceName: z.string(),
    osVersion: z.string(),
    locale: z.string(),
    deviceCountryCode: z.string().nullable()
});
export type AppInfo = z.infer<typeof sAppInfo>;

const APP_INFO_ARGUMENT = '--safely-app-info=';

/**
 * Fixed when the window is created: a `reload()` keeps the same renderer process and therefore the
 * same argv, so nothing that can change while the app runs belongs in `AppInfo`.
 */
export function encodeAppInfoArgument(appInfo: AppInfo): string {
    return APP_INFO_ARGUMENT + JSON.stringify(appInfo);
}

export function parseAppInfoArgument(argv: readonly string[]): AppInfo {
    const argument = argv.find(value => value.startsWith(APP_INFO_ARGUMENT));

    if (!argument) {
        throw new Error('The renderer was started without app info in its arguments');
    }

    const parsed: unknown = JSON.parse(argument.slice(APP_INFO_ARGUMENT.length));

    return sAppInfo.parse(parsed);
}
