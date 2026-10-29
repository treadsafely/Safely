import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SafelyFlame } from '../../src';
import {
    FlameAddress,
    FlameNetwork,
    ParserInvalidAmountError,
    ParserUnrecognizedError,
    ParserUnsupportedMemoError,
    ParserUnsupportedSchemeError,
    parseExternalInput
} from '../../src';

const BTC_MAINNET_ADDRESS = 'bc1qcleg3jtmvlar6cgm24vpq6n8ew3d0hame0av83';
const FLAME_MAINNET_ADDRESS = 'flame-mainnet-receiving';
const FLAME_TESTNET_ADDRESS = 'flame-testnet-receiving';

const VALID_FLAME_ADDRESSES: Record<string, FlameNetwork> = {
    [FLAME_MAINNET_ADDRESS]: FlameNetwork.MAINNET,
    [FLAME_TESTNET_ADDRESS]: FlameNetwork.TESTNET
};

describe('parseExternalInput', () => {
    let validateReceivingAddress: MockInstance<SafelyFlame['validateReceivingAddress']>;

    beforeEach(() => {
        validateReceivingAddress = vi
            .spyOn(globalThis.flameSdk, 'validateReceivingAddress')
            .mockImplementation((address, network) => VALID_FLAME_ADDRESSES[address] === network);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('FlameAddress.validForNetwork', () => {
        it('detects the network of a valid address', () => {
            expect(FlameAddress.validForNetwork(FLAME_MAINNET_ADDRESS)).toBe(FlameNetwork.MAINNET);
            expect(FlameAddress.validForNetwork(FLAME_TESTNET_ADDRESS)).toBe(FlameNetwork.TESTNET);
        });

        it('returns null for an address valid on no network', () => {
            expect(FlameAddress.validForNetwork('garbage')).toBeNull();
        });
    });

    it('parses a bare Flame address with its network', () => {
        expect(parseExternalInput(` ${FLAME_TESTNET_ADDRESS}\n`)).toEqual({
            name: 'flame-transfer',
            parsed: { address: FLAME_TESTNET_ADDRESS, network: FlameNetwork.TESTNET }
        });
    });

    it('parses a flame: URI with an amount, case-insensitive prefix', () => {
        expect(parseExternalInput(`FLAME:${FLAME_MAINNET_ADDRESS}?amount=0.5`)).toEqual({
            name: 'flame-transfer',
            parsed: { address: FLAME_MAINNET_ADDRESS, network: FlameNetwork.MAINNET, amount: '0.5' }
        });
    });

    it('trims the whole payload before matching a URI', () => {
        expect(parseExternalInput(`  flame:${FLAME_TESTNET_ADDRESS}\n`)).toEqual({
            name: 'flame-transfer',
            parsed: { address: FLAME_TESTNET_ADDRESS, network: FlameNetwork.TESTNET }
        });
    });

    it('rejects a flame: URI that carries a memo, even an empty one', () => {
        expect(() => parseExternalInput(`flame:${FLAME_TESTNET_ADDRESS}?memo=INV-42`)).toThrow(
            ParserUnsupportedMemoError
        );
        expect(() => parseExternalInput(`flame:${FLAME_TESTNET_ADDRESS}?amount=1&memo=`)).toThrow(
            ParserUnsupportedMemoError
        );
    });

    it('treats a throwing native validation as an unrecognized input only while parsing', () => {
        validateReceivingAddress.mockImplementation(() => {
            throw new Error('native failure');
        });

        expect(() => FlameAddress.validate('garbage', FlameNetwork.TESTNET)).toThrow();
        expect(FlameAddress.validForNetwork('garbage')).toBeNull();
        expect(() => parseExternalInput('garbage')).toThrow(ParserUnrecognizedError);
    });

    it('rejects a flame: URI amount with more decimals than the asset has', () => {
        expect(() =>
            parseExternalInput(`flame:${FLAME_MAINNET_ADDRESS}?amount=0.123456789`)
        ).toThrow(ParserInvalidAmountError);
    });

    it('does not accept a BTC address behind the flame: prefix', () => {
        expect(() => parseExternalInput(`flame:${BTC_MAINNET_ADDRESS}`)).toThrow(
            ParserUnrecognizedError
        );
    });

    it('still parses a bare BTC address and a bitcoin: URI', () => {
        expect(parseExternalInput(BTC_MAINNET_ADDRESS).name).toBe('btc-transfer');
        expect(parseExternalInput(`bitcoin:${BTC_MAINNET_ADDRESS}?amount=0.001`)).toEqual({
            name: 'btc-transfer',
            parsed: { address: BTC_MAINNET_ADDRESS, network: 'mainnet', amount: '0.001' }
        });
    });

    it('throws an unsupported-scheme error when Flame is not allowed', () => {
        expect(() => parseExternalInput(FLAME_MAINNET_ADDRESS, ['btc-transfer'])).toThrow(
            ParserUnsupportedSchemeError
        );
    });

    it('throws an unrecognized error for anything else', () => {
        expect(() => parseExternalInput('hello')).toThrow(ParserUnrecognizedError);
    });
});
