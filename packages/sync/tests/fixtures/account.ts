import { z } from 'zod';

import { defineVersionHList, hCons, hNil, projectIdentity } from '@safely/slottree';

import type { ISyncAccount, SyncAccountFactory } from '../../src';

export const Schema = z
    .object({
        wallets: z.array(
            z.object({
                __setId: z.string(),
                value: z.string()
            })
        )
    })
    .partial();

export const AccountV1 = {
    version: 1,
    schema: Schema,
    initial: {},
    projectUp: projectIdentity,
    projectDown: projectIdentity
} as const;

export const Versions = defineVersionHList(hCons(AccountV1, hNil));

type AccountLatest = (typeof Versions)['head'];

export type TestSyncAccount = ISyncAccount<AccountLatest>;
export type TestSyncAccountFactory = SyncAccountFactory<typeof Versions>;
