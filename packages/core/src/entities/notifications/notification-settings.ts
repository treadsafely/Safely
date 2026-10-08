import type { SNotificationEventKey, SNotifications } from '@safely/sync-storage';

import type { Portfolio } from '../portfolio';

export type NotificationEventKey = SNotificationEventKey;

export const RECEIVED_NOTIFICATION_EVENT_KEYS = [
    'receivedDetected',
    'receivedConfirmed',
    'receivedFinalized'
] as const satisfies readonly NotificationEventKey[];

export const SENT_NOTIFICATION_EVENT_KEYS = [
    'sentBroadcast',
    'sentConfirmed',
    'sentFinalized'
] as const satisfies readonly NotificationEventKey[];

export const NOTIFICATION_EVENT_KEYS = [
    ...RECEIVED_NOTIFICATION_EVENT_KEYS,
    ...SENT_NOTIFICATION_EVENT_KEYS
] as const satisfies readonly NotificationEventKey[];

const DEFAULT_EVENTS: Readonly<Record<NotificationEventKey, boolean>> = {
    receivedDetected: true,
    receivedConfirmed: true,
    receivedFinalized: false,
    sentBroadcast: false,
    sentConfirmed: true,
    sentFinalized: false
};

export class NotificationSettings {
    public static fromStored(stored: SNotifications | undefined): NotificationSettings {
        return new NotificationSettings(
            stored?.enabled ?? true,
            stored?.allWallets ?? true,
            new Set(Object.keys(stored?.portfolioIds ?? {})),
            { ...DEFAULT_EVENTS, ...stored?.events }
        );
    }

    constructor(
        public readonly enabled: boolean,
        public readonly allWallets: boolean,
        public readonly portfolioIds: ReadonlySet<string>,
        public readonly events: Readonly<Record<NotificationEventKey, boolean>>
    ) {}

    public isPortfolioSelected(portfolio: Portfolio): boolean {
        return this.allWallets || this.portfolioIds.has(portfolio.id.toString());
    }

    public selectPortfolios(portfolios: Portfolio[]): Portfolio[] {
        return portfolios.filter(portfolio => this.isPortfolioSelected(portfolio));
    }

    public get enabledEventKeys(): NotificationEventKey[] {
        return NOTIFICATION_EVENT_KEYS.filter(key => this.events[key]);
    }
}
