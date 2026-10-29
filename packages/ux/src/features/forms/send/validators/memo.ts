import { isFlameMemoWithinLimit } from '@safely/core';

import { SendFormError } from '../errors';

export function validateMemo(memo: string): SendFormError | undefined {
    return isFlameMemoWithinLimit(memo) ? undefined : SendFormError.MEMO_TOO_LONG;
}
