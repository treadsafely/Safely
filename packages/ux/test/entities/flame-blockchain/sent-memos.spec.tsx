import { act, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as accountState from '../../../src/entities/account/account-state';
import { accountKey } from '../../../src/entities/account/keys';
import {
    useFlameSentMemos,
    useSaveFlameSentMemo
} from '../../../src/entities/flame-blockchain/sent-memos';
import { createTestAppContext, renderHookWithProviders } from '../../harness';

vi.mock('../../../src/entities/account/account-state', async () => ({
    ...(await vi.importActual<object>('../../../src/entities/account/account-state')),
    useActiveAccountQuery: vi.fn(),
    useActiveAccountQueryKey: vi.fn()
}));

const ACCOUNT_ID = 'account-1';
const TXID = 'ab'.repeat(32);

describe('Flame sent memos', () => {
    beforeEach(() => {
        (accountState.useActiveAccountQuery as Mock).mockReturnValue({
            data: { accountId: ACCOUNT_ID }
        });
        (accountState.useActiveAccountQueryKey as Mock).mockReturnValue(
            accountKey.accountId(ACCOUNT_ID)
        );
    });

    it('starts empty and returns a saved memo by txid', async () => {
        const { result } = renderHookWithProviders(
            () => ({ memos: useFlameSentMemos(), save: useSaveFlameSentMemo() }),
            { appContext: createTestAppContext() }
        );

        await waitFor(() => expect(result.current.memos.data).toEqual({}));

        await act(() => result.current.save(TXID, 'за кофе'));

        await waitFor(() => expect(result.current.memos.data).toEqual({ [TXID]: 'за кофе' }));
    });
});
