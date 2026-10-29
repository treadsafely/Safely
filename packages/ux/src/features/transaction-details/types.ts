export type TransactionStatusView = {
    title: string;
    description: string | null;
    descriptionTone: 'secondary' | 'accentGreen';
};

export type TransactionFeeView = {
    formattedFiat: string | null;
    formattedValue: string;
};

export type TransactionDetailsView = {
    title: string;
    confirmedAtLabel: string | null;
    isInitiator: boolean;
    amountSign: '+' | '−' | null;
    primaryAmount: string;
    secondaryAmount: string | null;
    counterpartyLabel: string;
    counterpartyAddress: string | null;
    counterpartyName: string;
    memo: string | null;
    status: TransactionStatusView;
    fee: TransactionFeeView | null;
    txid: string;
    txidLabel: string;
    explorerUrl: string | null;
    hasFiatRateNote: boolean;
};

export type BtcTransactionStatusView = TransactionStatusView & { description: string };

export type BtcTransactionDetailsView = TransactionDetailsView & {
    amountSign: '+' | '−';
    counterpartyAddress: string;
    memo: null;
    status: BtcTransactionStatusView;
    fee: (TransactionFeeView & { formattedFiat: string }) | null;
    assetImage: string | undefined;
    explorerUrl: string;
};

export type FlameTransactionDetailsView = TransactionDetailsView & {
    secondaryAmount: null;
    explorerUrl: null;
    hasFiatRateNote: false;
};
