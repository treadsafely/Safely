import type { Portfolio } from '@safely/core';
import { PortfolioType } from '@safely/core';

export type RemoveWalletCopy = {
    titleKey: string;
    subtitleKey: string;
    checkboxKey?: string;
    buttonKey: string;
    hasBackUpLink: boolean;
};

export function resolveRemoveWalletCopy(portfolio: Portfolio): RemoveWalletCopy {
    if (portfolio.type === PortfolioType.LEDGER) {
        return {
            titleKey: 'removeWallet.disconnectLedger.title',
            subtitleKey: 'removeWallet.disconnectLedger.subtitle',
            checkboxKey: 'removeWallet.disconnectLedger.checkbox',
            buttonKey: 'removeWallet.disconnectLedger.button',
            hasBackUpLink: false
        };
    }

    if (portfolio.type === PortfolioType.WATCH_ONLY) {
        return {
            titleKey: 'removeWallet.title',
            subtitleKey: 'removeWallet.watchOnly.subtitle',
            buttonKey: 'removeWallet.removeButton',
            hasBackUpLink: false
        };
    }

    const isRevealed = portfolio.secretRevealedStatus !== null;

    return {
        titleKey: 'removeWallet.title',
        subtitleKey: isRevealed
            ? 'removeWallet.revealed.subtitle'
            : 'removeWallet.notRevealed.subtitle',
        checkboxKey: isRevealed
            ? 'removeWallet.revealed.checkbox'
            : 'removeWallet.notRevealed.checkbox',
        buttonKey: 'removeWallet.removeButton',
        hasBackUpLink: true
    };
}
