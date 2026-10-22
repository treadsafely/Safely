import { describe, expect, it } from 'vitest';

import { FlameAddress } from '../../../src';

const TESTNET_ADDRESS =
    'tf15gtu9mtvytf2w86z7ypdxx3c78fmt95elvx52hlzrlvfs7gw2dj0gqceswac8y9vqzxskedwllg8tf8jpc055vtshxdha59gvggpvasqpc3mr';
const PREDICATE = 'a217c2ed6c22d2a71f42f102d31a38f1d3b59699fb0d455fe21fd898790e5364';
const TRACKING_ADDRESS = 'tc15gtu9mtvytf2w86z7ypdxx3c78fmt95elvx52hlzrlvfs7gw2djqcqsemp';

describe('FlameAddress', () => {
    it('accepts a testnet address longer than the bech32 limit', () => {
        expect(FlameAddress.validate(TESTNET_ADDRESS, 'testnet')).toBe(true);
    });

    it('rejects a corrupted checksum', () => {
        const corrupted =
            TESTNET_ADDRESS.slice(0, -1) + (TESTNET_ADDRESS.endsWith('q') ? 'p' : 'q');
        expect(FlameAddress.validate(corrupted, 'testnet')).toBe(false);
    });

    it('rejects addresses of other networks and formats', () => {
        expect(FlameAddress.validate(TESTNET_ADDRESS, 'mainnet')).toBe(false);
        expect(FlameAddress.validate('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', 'testnet')).toBe(
            false
        );
        expect(FlameAddress.validate('', 'testnet')).toBe(false);
    });

    it('encodes the predicate as a testnet tracking address', () => {
        expect(FlameAddress.toTracking(PREDICATE, 'testnet')).toBe(TRACKING_ADDRESS);
        expect(FlameAddress.toTracking(PREDICATE, 'mainnet')).toBeNull();
    });

    it('splits the address by the data it shares with its tracking address', () => {
        expect(FlameAddress.splitByTracking(TESTNET_ADDRESS, TRACKING_ADDRESS)).toEqual({
            head: 'tf1',
            shared: '5gtu9mtvytf2w86z7ypdxx3c78fmt95elvx52hlzrlvfs7gw2dj',
            rest: '0gqceswac8y9vqzxskedwllg8tf8jpc055vtshxdha59gvggpvasqpc3mr'
        });
    });
});
