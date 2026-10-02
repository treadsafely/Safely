/* eslint-disable @typescript-eslint/consistent-type-imports */

import { QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILedgerSessionPort } from '@safely/core';
import { Contact, VM_TYPE } from '@safely/core';

import * as accountState from '../../../src/entities/account/account-state';
import {
    accountStore,
    accountStoreActions
} from '../../../src/entities/account/sync-storage/account-store';
import { SyncStorageProvider } from '../../../src/entities/account/sync-storage/SyncStorageProvider';
import { LedgerSessionPortProvider } from '../../../src/entities/ledger';
import { AppContext } from '../../../src/shared/providers/AppContext';
import { createMockSyncAccount, createTestAppContext, createTestQueryClient } from '../../harness';

vi.mock('../../../src/entities/account/account-state', async () => {
    const actual = await vi.importActual<
        typeof import('../../../src/entities/account/account-state')
    >('../../../src/entities/account/account-state');
    return { ...actual, useAccounts: vi.fn() };
});

const ledgerSessionPort: ILedgerSessionPort = {
    withSession: () => {
        throw new Error('Ledger session is not used in this test');
    }
};

const contactJson = (id: string) =>
    new Contact({
        id,
        addresses: [
            { blockchain: VM_TYPE.BTC, address: 'bc1qcleg3jtmvlar6cgm24vpq6n8ew3d0hame0av83' }
        ],
        meta: { name: id, color: 'blue' }
    }).toJSON();

describe('SyncStorageProvider', () => {
    beforeEach(() => {
        accountStoreActions.clear();
    });

    it('reads the snapshot after subscribing, so a change during mount is not lost', () => {
        const account = createMockSyncAccount({ accountId: 'A', initial: { contacts: [] } });
        (accountState.useAccounts as Mock).mockReturnValue([account]);

        const fresh = [contactJson('c1')];
        (account.syncProvider.onChange as Mock).mockImplementationOnce(
            (_key: string, observer: () => void) => {
                (account.syncProvider.getAll as Mock).mockReturnValue({
                    ...account.syncProvider.getAll(),
                    contacts: fresh
                });
                (account.syncProvider.get as Mock).mockImplementation((k: string) =>
                    k === 'contacts' ? fresh : undefined
                );
                observer();
                return () => undefined;
            }
        );

        act(() => {
            render(
                <QueryClientProvider client={createTestQueryClient()}>
                    <AppContext.Provider value={createTestAppContext()}>
                        <LedgerSessionPortProvider port={ledgerSessionPort}>
                            <SyncStorageProvider>{null}</SyncStorageProvider>
                        </LedgerSessionPortProvider>
                    </AppContext.Provider>
                </QueryClientProvider>
            );
        });

        expect(
            accountStore
                .getState()
                .accountsData.get('A')
                ?.contacts.map(c => c.id)
        ).toEqual(['c1']);
    });
});
