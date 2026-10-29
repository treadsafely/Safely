export enum SendFormError {
    INVALID_WALLET_ADDRESS = 'sendForm.errors.invalidWalletAddress',
    SELF_TRANSFER = 'sendForm.errors.selfTransfer',
    UNSUPPORTED_BLOCKCHAIN = 'sendForm.errors.unsupportedBlockchain',
    SELECT_TOKEN = 'sendForm.errors.selectToken',
    SELECT_TOKEN_FIRST = 'sendForm.errors.selectTokenFirst',
    UNABLE_TO_VALIDATE_TOKEN = 'sendForm.errors.unableToValidateToken',
    INVALID_AMOUNT = 'sendForm.errors.invalidAmount',
    INSUFFICIENT_BALANCE = 'sendForm.errors.insufficientBalance',
    UNRECOGNIZED_AMOUNT = 'sendForm.errors.unrecognizedAmount',
    MEMO_TOO_LONG = 'sendForm.errors.memoTooLong'
}
