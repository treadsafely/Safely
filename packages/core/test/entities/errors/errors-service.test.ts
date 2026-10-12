import { describe, expect, it } from 'vitest';

import { BtcSendDustError, getErrorText, ParserInvalidAmountError } from '../../../src';

const config = {
    UnknownError: () => 'fallback',
    ParserInvalidAmountError: () => 'invalid amount'
};

function renameClassOf(error: Error): Error {
    Object.defineProperty(error, 'constructor', { value: class a extends Error {} });

    return error;
}

describe('getErrorText', () => {
    it('picks the handler of a custom error', () => {
        expect(getErrorText(new ParserInvalidAmountError(), config)).toBe('invalid amount');
    });

    it('picks it even when a minifier renamed the class', () => {
        expect(getErrorText(renameClassOf(new ParserInvalidAmountError()), config)).toBe(
            'invalid amount'
        );
    });

    it('falls back for a custom error the config says nothing about', () => {
        expect(getErrorText(new BtcSendDustError(), config)).toBe('fallback');
    });

    it('falls back for anything else', () => {
        expect(getErrorText(new Error('boom'), config)).toBe('fallback');
    });
});
