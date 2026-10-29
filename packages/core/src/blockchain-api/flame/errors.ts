export class FlameInsufficientBalanceError extends Error {}

export class FlameInputsSpentError extends Error {}

export class FlameSendStatusUnknownError extends Error {
    constructor(txId: string, options?: ErrorOptions) {
        super(`Flame transfer ${txId} may have been published`, options);
    }
}
