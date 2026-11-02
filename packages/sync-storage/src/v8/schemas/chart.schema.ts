import z from 'zod';

export const sChart = z
    .object({
        collapsed: z.boolean()
    })
    .partial();

export type SChart = z.infer<typeof sChart>;
