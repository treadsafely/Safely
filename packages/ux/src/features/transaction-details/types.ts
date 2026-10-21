export type TransactionStatusView = {
    title: string;
    description: string;
    descriptionTone: 'secondary' | 'accentGreen';
};

export type TransactionFeeView = {
    formattedFiat: string;
    formattedValue: string;
};

export type TransactionDetailsView = {
    title: string;
    confirmedAtLabel: string | null;
    isInitiator: boolean;
    assetImage: string | undefined;
    amountSign: '+' | '−';
    primaryAmount: string;
    secondaryAmount: string | null;
    counterpartyLabel: string;
    counterpartyAddress: string;
    counterpartyAddressLabel: string;
    status: TransactionStatusView;
    fee: TransactionFeeView | null;
    txid: string;
    txidLabel: string;
    explorerUrl: string;
    hasFiatRateNote: boolean;
};
