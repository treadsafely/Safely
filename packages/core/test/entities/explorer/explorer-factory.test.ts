import { describe, expect, it } from 'vitest';

import type { BootConfig } from '../../../src/api/config/models';
import { FlameNetwork } from '../../../src/di/safely-flame';
import { BLOCKCHAIN_NAME, ExplorerFactory } from '../../../src/entities';

const TESTNET_ONLY: BootConfig['blockchains']['flame'] = {
    testnet: {
        rpc_url: 'https://flame.test',
        explorer_account_url: 'https://flame.test/explorer/#/actor/%s',
        explorer_tx_url: 'https://flame.test/explorer/#/tx/%s'
    }
};

const factory = (flame: BootConfig['blockchains']['flame']) =>
    new ExplorerFactory({
        bitcoin: {
            mainnet: {
                api_url: 'https://btc.test',
                explorer_account_url: 'https://btc.test/address/%s',
                explorer_tx_url: 'https://btc.test/tx/%s'
            }
        },
        flame
    });

describe('ExplorerFactory for Flame', () => {
    it('builds the links for the network of the wallet', () => {
        const explorer = factory(TESTNET_ONLY).createExplorer(
            BLOCKCHAIN_NAME.FLAME,
            FlameNetwork.TESTNET
        );

        expect(explorer?.transaction('ab')).toBe('https://flame.test/explorer/#/tx/ab');
        expect(explorer?.wallet('t1x')).toBe('https://flame.test/explorer/#/actor/t1x');
    });

    it('has no explorer for a network the config does not serve', () => {
        expect(
            factory(TESTNET_ONLY).createExplorer(BLOCKCHAIN_NAME.FLAME, FlameNetwork.MAINNET)
        ).toBeNull();
    });

    it('has no explorer when the config omits Flame', () => {
        expect(
            factory(undefined).createExplorer(BLOCKCHAIN_NAME.FLAME, FlameNetwork.TESTNET)
        ).toBeNull();
    });
});
