import z from 'zod';

export const sNewsNotificationsEnabled = z.union([z.null(), z.boolean()]);
