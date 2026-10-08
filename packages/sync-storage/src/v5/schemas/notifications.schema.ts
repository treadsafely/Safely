import z from 'zod';

export const sNotificationEvents = z
    .object({
        receivedDetected: z.boolean(),
        receivedConfirmed: z.boolean(),
        receivedFinalized: z.boolean(),
        sentBroadcast: z.boolean(),
        sentConfirmed: z.boolean(),
        sentFinalized: z.boolean()
    })
    .partial();

export const sNotifications = z
    .object({
        enabled: z.boolean(),
        allWallets: z.boolean(),
        portfolioIds: z.record(z.string(), z.literal(true)),
        events: sNotificationEvents
    })
    .partial();

export type SNotificationEvents = z.infer<typeof sNotificationEvents>;
export type SNotificationEventKey = keyof Required<SNotificationEvents>;
export type SNotifications = z.infer<typeof sNotifications>;
