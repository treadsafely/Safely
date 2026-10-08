import { z } from 'zod';

export const DESKTOP_BUILD = 'macos';

export const sAppInfo = z.object({
    version: z.string(),
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
