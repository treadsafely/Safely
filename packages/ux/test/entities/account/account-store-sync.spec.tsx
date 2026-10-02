/* eslint-disable @typescript-eslint/consistent-type-imports */

import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILedgerSessionPort } from '@safely/core';
import { Contact, VM_TYPE } from '@safely/core';

import {
    useAccountsFactory,
    useAccountsQueryConfig
} from '../../../src/entities/account/account-state';
import {
    accountStore,
    accountStoreActions
} from '../../../src/entities/account/sync-storage/account-store';
import { LedgerSessionPortProvider } from '../../../src/entities/ledger';
import { AppContext } from '../../../src/shared/providers/AppContext';
import { createMockSyncAccount, createTestAppContext, createTestQueryClient } from '../../harness';

vi.mock('../../../src/shared', async () => {
    const actual =
        await vi.importActual<typeof import('../../../src/shared')>('../../../src/shared');
    return { ...actual, useBootConfig: () => ({ sync: { api_url: 'http://localhost' } }) };
});

const ledgerSessionPort: ILedgerSessionPort = {
    withSession: () => {
        throw new Error('Ledger session is not used in this test');
    }
};

function renderAccountsQuery() {
    const appContext = createTestAppContext();
    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: PropsWithChildren): ReactElement => (
        <QueryClientProvider client={queryClient}>
            <AppContext.Provider value={appContext}>
                <LedgerSessionPortProvider port={ledgerSessionPort}>
                    {children}
                </LedgerSessionPortProvider>
            </AppContext.Provider>
        </QueryClientProvider>
    );

    const rendered = renderHook(
        () => ({ config: useAccountsQueryConfig(), factory: useAccountsFactory() }),
        { wrapper }
    );

    const { config, factory } = rendered.result.current;
    const getSyncAccounts = vi.spyOn(factory, 'getSyncAccounts');

    return { queryFn: () => config.queryFn(), getSyncAccounts };
}

describe('useAccountsQueryConfig', () => {
    beforeEach(() => {
        accountStoreActions.clear();
    });

    it('attaches every account to the store before the list resolves', async () => {
        const a = createMockSyncAccount({ accountId: 'A' });
        const b = createMockSyncAccount({ accountId: 'B' });
        const { queryFn, getSyncAccounts } = renderAccountsQuery();
        getSyncAccounts.mockResolvedValue([a, b]);

        const accounts = await queryFn();

        expect(accounts).toEqual([a, b]);
        expect([...accountStore.getState().accountsData.keys()]).toEqual(['A', 'B']);
    });

    it('drops accounts that are no longer in the list', async () => {
        const a = createMockSyncAccount({ accountId: 'A' });
        const b = createMockSyncAccount({ accountId: 'B' });
        const { queryFn, getSyncAccounts } = renderAccountsQuery();

        getSyncAccounts.mockResolvedValue([a, b]);
        await queryFn();
        getSyncAccounts.mockResolvedValue([b]);
        await queryFn();

        expect([...accountStore.getState().accountsData.keys()]).toEqual(['B']);
    });

    it('keeps the entity instances of an unchanged account across refetches', async () => {
        const contact = new Contact({
            id: 'c1',
            addresses: [
                { blockchain: VM_TYPE.BTC, address: 'bc1qcleg3jtmvlar6cgm24vpq6n8ew3d0hame0av83' }
            ],
            meta: { name: 'Alice', color: 'blue' }
        }).toJSON();
        const a = createMockSyncAccount({ accountId: 'A', initial: { contacts: [contact] } });
        const { queryFn, getSyncAccounts } = renderAccountsQuery();
        getSyncAccounts.mockResolvedValue([a]);

        await queryFn();
        const first = accountStore.getState().accountsData.get('A')?.contacts[0];
        await queryFn();
        const second = accountStore.getState().accountsData.get('A')?.contacts[0];

        expect(first).toBeDefined();
        expect(second).toBe(first);
    });
});
