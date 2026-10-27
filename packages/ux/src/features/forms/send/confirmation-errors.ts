import { useParseError } from '../../../shared';

const SEND_ERROR_CONFIG = {
    BtcSendDustError: 'confirmation.sendError.btc.dust',
    FlameInputsSpentError: 'confirmation.sendError.flame.inputsSpent'
} as const;

const ESTIMATE_ERROR_CONFIG = {
    OutputsAreSpendingMoreThanInputsError:
        'confirmation.estimateError.btc.outputsAreSpendingMoreThanInputs',
    BtcInsufficientFundsForFeeError: 'confirmation.estimateError.btc.insufficientFundsForFee',
    FlameInsufficientBalanceError: 'confirmation.estimateError.flame.insufficientBalance'
} as const;

export function useParseSendError() {
    return useParseError(SEND_ERROR_CONFIG, { fallback: 'confirmation.sendError.default' });
}

export function useParseEstimateError() {
    return useParseError(ESTIMATE_ERROR_CONFIG, { fallback: 'confirmation.estimateError.default' });
}
