import type { PortfolioLedger, PortfolioMeta } from '@safely/core';
import { PortfolioIdLedger, PortfolioNetworkType } from '@safely/core';

import { getLedgerWalletName } from '../../entities';

export type LedgerAccountsSelection = {
    masterFingerprint: Buffer;
    deviceModel: string;
    accounts: { index: number; xpub: string }[];
    targetPortfolio: PortfolioLedger | undefined;
};

export const getLedgerPortfolioDraft = (
    selection: LedgerAccountsSelection,
    portfoliosCount: number
): PortfolioMeta =>
    selection.targetPortfolio?.meta ?? {
        name: getLedgerWalletName(selection.deviceModel, portfoliosCount + 1),
        icon: new PortfolioIdLedger({
            masterFingerprint: selection.masterFingerprint.toString('hex'),
            networkType: PortfolioNetworkType.MAINNET
        }).getFallbackEmoji()
    };
