import { describe, expect, it } from 'vitest';

import { bootConfigSchema } from '../../../src/api/config/models';

const flameSchema = bootConfigSchema.shape.blockchains.shape.flame;

const TESTNET = {
    rpc_url: 'https://flame.test',
    explorer_account_url: 'https://flame.test/explorer/#/actor/%s',
    explorer_tx_url: 'https://flame.test/explorer/#/tx/%s'
};

describe('bootConfigSchema flame', () => {
    it('drops a malformed network entry and keeps the valid one', () => {
        expect(
            flameSchema.parse({ mainnet: { rpc_url: 'http://flame.test' }, testnet: TESTNET })
        ).toEqual({ mainnet: undefined, testnet: TESTNET });
    });
});
