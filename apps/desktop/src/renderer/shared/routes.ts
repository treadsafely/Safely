import z from 'zod';

import { DEV_TOOLS, MAIN_MODALS, SETTINGS_SECTIONS } from '@safely/web-ui';

export const ROUTE = {
    main: '/',
    updates: '/updates',
    safety: '/safety',
    settings: '/settings/{-$section}/{-$tool}',
    onboarding: {
        welcome: '/onboarding'
    }
} as const;

export const sSettingsParams = z.object({
    section: z.enum(SETTINGS_SECTIONS).optional().catch(undefined),
    tool: z.enum(DEV_TOOLS).optional().catch(undefined)
});

export const sMainSearch = z.object({
    modal: z.enum(MAIN_MODALS).optional().catch(undefined)
});

export type SettingsParams = z.infer<typeof sSettingsParams>;
export type MainSearch = z.infer<typeof sMainSearch>;
