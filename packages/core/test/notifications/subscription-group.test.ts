import { describe, expect, it } from 'vitest';

import type { Portfolio } from '../../src';
import {
    BtcXpub,
    buildSubscriptionGroup,
    deriveNotificationSyncId,
    NotificationSettings,
    PortfolioNetworkType,
    PortfolioWatchOnlyBtc,
    resolvePortfolioNotificationTargetNames,
    resolvePortfolioNotificationTargets,
    WatchOnlySource
} from '../../src';

const XPUB =
    'xpub6BzEhyXKPFoDRvGZ9EvzhmtM6LEPK1bkqSmmkiRnvcExLSJbksFF7oc1D4DTMy8bbyvFaMj5tpNUvEQVD93KGjUu8asKYQ1TQCphStEgggF';
const ZPUB = BtcXpub.toZpub(XPUB);
const ADDRESS = 'bc1q5v68nzc6rjgcl8ug0slpx77ucm4spnwzkwkqy2';
const TESTNET_ADDRESS = 'tb1q4tvt7x6veyr96kj3deph5av03czytyw5ssalr6';
const SYNC_ID = deriveNotificationSyncId('account-1');

function watchOnly(
    id: { xpub: string } | { address: string },
    networkType: PortfolioNetworkType = PortfolioNetworkType.MAINNET
): Portfolio {
    return PortfolioWatchOnlyBtc.create(
        'xpub' in id
            ? { source: WatchOnlySource.XPUB, xpub: id.xpub, networkType }
            : { source: WatchOnlySource.ADDRESS, address: id.address, networkType },
        { name: 'w', icon: { type: 'emoji', value: '🐶' } }
    );
}

describe('resolvePortfolioNotificationTargets', () => {
    it('uses zpub for xpub watch-only and address for address watch-only', () => {
        expect(resolvePortfolioNotificationTargets(watchOnly({ xpub: XPUB }))).toEqual([ZPUB]);
        expect(ZPUB.startsWith('zpub')).toBe(true);
        expect(resolvePortfolioNotificationTargets(watchOnly({ address: ADDRESS }))).toEqual([
            ADDRESS
        ]);
    });

    it('skips testnet portfolios', () => {
        expect(
            resolvePortfolioNotificationTargets(
                watchOnly({ address: TESTNET_ADDRESS }, PortfolioNetworkType.TESTNET)
            )
        ).toEqual([]);
    });
});

describe('resolvePortfolioNotificationTargetNames', () => {
    it('maps every target of a portfolio to its display name', () => {
        const named = watchOnly({ xpub: XPUB });
        expect(resolvePortfolioNotificationTargetNames(named)).toEqual({ [ZPUB]: '🐶 w' });
        expect(Object.keys(resolvePortfolioNotificationTargetNames(named))).toEqual(
            resolvePortfolioNotificationTargets(named)
        );
        expect(
            resolvePortfolioNotificationTargetNames(
                watchOnly({ address: TESTNET_ADDRESS }, PortfolioNetworkType.TESTNET)
            )
        ).toEqual({});
    });
});

describe('deriveNotificationSyncId', () => {
    it('is a stable one-way hash of the account id', () => {
        expect(SYNC_ID).toMatch(/^[0-9a-f]{64}$/);
        expect(deriveNotificationSyncId('account-1')).toBe(SYNC_ID);
        expect(deriveNotificationSyncId('account-2')).not.toBe(SYNC_ID);
    });
});

describe('buildSubscriptionGroup', () => {
    const portfolios = [watchOnly({ xpub: XPUB }), watchOnly({ address: ADDRESS })];

    it('maps default events to received/sent confirmations for all wallets', () => {
        const group = buildSubscriptionGroup(
            NotificationSettings.fromStored(undefined),
            portfolios
        );

        expect(group).toEqual({
            events: [
                { type: 'received', confirmations: 0, targets: [ZPUB, ADDRESS] },
                { type: 'received', confirmations: 1, targets: [ZPUB, ADDRESS] },
                { type: 'sent', confirmations: 1, targets: [ZPUB, ADDRESS] }
            ]
        });
    });

    it('restricts targets to selected portfolios when allWallets is off', () => {
        const settings = NotificationSettings.fromStored({
            allWallets: false,
            portfolioIds: { [portfolios[1].id.toString()]: true },
            events: { receivedDetected: true, receivedConfirmed: false, sentConfirmed: false }
        });

        expect(buildSubscriptionGroup(settings, portfolios)).toEqual({
            events: [{ type: 'received', confirmations: 0, targets: [ADDRESS] }]
        });
    });

    it('returns null when disabled, without targets or without events', () => {
        expect(
            buildSubscriptionGroup(NotificationSettings.fromStored({ enabled: false }), portfolios)
        ).toBeNull();
        expect(
            buildSubscriptionGroup(
                NotificationSettings.fromStored({ allWallets: false, portfolioIds: {} }),
                portfolios
            )
        ).toBeNull();
        expect(
            buildSubscriptionGroup(
                NotificationSettings.fromStored({
                    events: {
                        receivedDetected: false,
                        receivedConfirmed: false,
                        sentConfirmed: false
                    }
                }),
                portfolios
            )
        ).toBeNull();
    });
});
