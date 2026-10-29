export function transactionTitleKey(transaction: {
    isInitiator: boolean;
    isPending: boolean;
}): string {
    if (transaction.isPending) {
        return transaction.isInitiator
            ? 'history.transactionInfo.sending'
            : 'history.transactionInfo.receiving';
    }

    return transaction.isInitiator
        ? 'history.transactionInfo.sent'
        : 'history.transactionInfo.received';
}
