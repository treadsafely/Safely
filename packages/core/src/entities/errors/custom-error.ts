import { ReconnectFromAnotherAccountError } from '@safely/sync';

import { InvalidBlockchainAndTokenError } from './invalid-blockchain-and-token.error';
import { InvalidMnemonicError } from './invalid-mnemonic.error';
import { LinkingFailedToOpenError } from './linking-failed-to-open.error';
import { LinkingUnsafeProtocolError } from './linking-unsafe-protocol.error';
import { OutputsAreSpendingMoreThanInputsError } from './outputs-are-spending-more-than-inputs.error';
import { PortfolioAlreadyExistsError } from './portfolio-already-exists.error';
import { PortfolioGenerationFailedError } from './portfolio-generation-failed.error';
import { BtcSendDustError } from '../../blockchain-api/btc/errors';
import {
    FlameInputsSpentError,
    FlameInsufficientBalanceError
} from '../../blockchain-api/flame/errors';
import {
    ParserInvalidAmountError,
    ParserUnrecognizedError,
    ParserUnsupportedSchemeError
} from '../../external-input/errors';

export const customErrors = {
    InvalidMnemonicError,
    PortfolioAlreadyExistsError,
    PortfolioGenerationFailedError,
    BtcSendDustError,
    OutputsAreSpendingMoreThanInputsError,
    FlameInsufficientBalanceError,
    FlameInputsSpentError,
    LinkingUnsafeProtocolError,
    LinkingFailedToOpenError,
    ReconnectFromAnotherAccountError,
    ParserInvalidAmountError,
    ParserUnrecognizedError,
    ParserUnsupportedSchemeError,
    InvalidBlockchainAndTokenError
} as const;
export type CustomError = InstanceType<(typeof customErrors)[keyof typeof customErrors]>;

export function isCustomError(err: unknown): err is CustomError {
    if (typeof err !== 'object' || err === null) {
        return false;
    }
    return Object.values(customErrors).some(v => err instanceof v);
}
