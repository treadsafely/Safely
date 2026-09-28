import type { NotificationEventKey } from './notification-settings';
import type { NotificationSettings } from './notification-settings';
import type { NotificationEventType, SubscriptionGroup } from '../../api/notifications';
import { BtcXpub } from '../../blockchain-api';
import { sha256PrefixString } from '../../utils';
import type { Portfolio, PortfolioMetaIcon } from '../portfolio';
import { PortfolioNetworkType, PortfolioType } from '../portfolio';

const EVENT_BY_KEY: Readonly<
    Record<NotificationEventKey, { type: NotificationEventType; confirmations: number }>
> = {
    receivedDetected: { type: 'received', confirmations: 0 },
    receivedConfirmed: { type: 'received', confirmations: 1 },
    receivedFinalized: { type: 'received', confirmations: 6 },
    sentBroadcast: { type: 'sent', confirmations: 0 },
    sentConfirmed: { type: 'sent', confirmations: 1 },
    sentFinalized: { type: 'sent', confirmations: 6 }
};

export function deriveNotificationSyncId(accountId: string): string {
    return sha256PrefixString(accountId, 32);
}

export function resolvePortfolioNotificationTargets(portfolio: Portfolio): string[] {
    if (portfolio.networkType !== PortfolioNetworkType.MAINNET) {
        return [];
    }

    if (portfolio.type === PortfolioType.WATCH_ONLY) {
        return [
            portfolio.wallet.xpub ? BtcXpub.toZpub(portfolio.wallet.xpub) : portfolio.wallet.address
        ];
    }

    return portfolio.derivations.map(derivation => BtcXpub.toZpub(derivation.chains.btc.xpub));
}

export function resolvePortfolioNotificationTargetNames(
    portfolio: Portfolio
): Record<string, string> {
    if (portfolio.networkType !== PortfolioNetworkType.MAINNET) {
        return {};
    }

    if (portfolio.type === PortfolioType.LEDGER) {
        return Object.fromEntries(
            portfolio.derivations.map(derivation => [
                BtcXpub.toZpub(derivation.chains.btc.xpub),
                formatWalletName(derivation.meta.name, portfolio.meta.icon)
            ])
        );
    }

    return Object.fromEntries(
        resolvePortfolioNotificationTargets(portfolio).map(target => [
            target,
            formatWalletName(portfolio.meta.name, portfolio.meta.icon)
        ])
    );
}

function formatWalletName(name: string, icon: PortfolioMetaIcon): string {
    return icon.type === 'emoji' ? `${icon.value} ${name}` : name;
}

export function buildSubscriptionGroup(
    settings: NotificationSettings,
    portfolios: Portfolio[]
): SubscriptionGroup | null {
    if (!settings.enabled) {
        return null;
    }

    const targets = [
        ...new Set(
            settings.selectPortfolios(portfolios).flatMap(resolvePortfolioNotificationTargets)
        )
    ];
    const events = settings.enabledEventKeys.map(key => ({ ...EVENT_BY_KEY[key], targets }));

    if (targets.length === 0 || events.length === 0) {
        return null;
    }

    return { events };
}
