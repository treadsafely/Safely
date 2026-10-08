import { describe, expect, it } from 'vitest';

import { Logger } from '@safely/sync';

import { NumberFormatter, WebNumberFormatLocale } from '../src';

const formatter = new NumberFormatter(new WebNumberFormatLocale('en-US'), new Logger());

const NBSP = '\u00a0';
const NARROW_NBSP = '\u202f';
const THIN_SPACE = '\u2009';
const RIGHT_QUOTE = '\u2019';

const resolved = (raw: string, value: string) =>
    expect(formatter.normalizePastedInput(raw)).toEqual({ value, status: 'ok' });

const ambiguous = (raw: string) =>
    expect(formatter.normalizePastedInput(raw)).toEqual({ value: '', status: 'ambiguous' });

describe('NumberFormatter.normalizePastedInput', () => {
    it('resolves the reported cross-locale bug repros to the correct magnitude', () => {
        resolved('0.123', '0.123');
        resolved('0,123', '0.123');
    });

    it('parses grouped values with an explicit decimal separator', () => {
        resolved('1.234,56', '1234.56');
        resolved('1,234.56', '1234.56');
        resolved('1,234,567.89', '1234567.89');
        resolved('1.234.567,89', '1234567.89');
        resolved('1,234,567', '1234567');
        resolved('12,34,567', '1234567');
    });

    it('treats a single separator with a non-3-digit tail as a decimal', () => {
        resolved('1,00', '1.00');
        resolved('1.00', '1.00');
        resolved('1,23', '1.23');
        resolved('1234,567', '1234.567');
        resolved('1234.567', '1234.567');
    });

    it('uses structural certainty to keep unambiguous single-separator cases', () => {
        resolved('.5', '0.5');
        resolved(',234', '0.234');
        resolved('5.', '5');
        resolved('5', '5');
        resolved('007', '7');
    });

    it('handles whitespace and apostrophe grouping', () => {
        resolved('1 234,56', '1234.56');
        resolved('1 234,56', '1234.56');
        resolved("1'234.56", '1234.56');
        resolved('1 234 567', '1234567');
    });

    it('clears on empty input without flagging ambiguity', () => {
        resolved('', '');
    });

    it('rejects the genuinely ambiguous 1000x cross-locale cases', () => {
        ambiguous('1,234');
        ambiguous('1.234');
        ambiguous('12,345');
    });

    it('rejects structurally malformed numbers', () => {
        ambiguous('1.23,00');
        ambiguous('1,2.3');
        ambiguous('1,2,3');
        ambiguous('1.2.3');
        ambiguous('1 2 3');
        ambiguous('1.234 567,89');
    });

    it('rejects signs and garbage', () => {
        ambiguous('-5');
        ambiguous('1a2');
    });

    it('rejects values more precise than the input allows instead of truncating them', () => {
        expect(formatter.normalizePastedInput('0.00001', 2)).toEqual({
            value: '',
            status: 'ambiguous'
        });
        expect(formatter.normalizePastedInput('1.234', 2)).toEqual({
            value: '',
            status: 'ambiguous'
        });
        expect(formatter.normalizePastedInput('1.23', 2)).toEqual({ value: '1.23', status: 'ok' });
        expect(formatter.normalizePastedInput('1234', 2)).toEqual({ value: '1234', status: 'ok' });
        expect(formatter.normalizePastedInput('0.00001', 8)).toEqual({
            value: '0.00001',
            status: 'ok'
        });
    });

    it('parses indian grouping', () => {
        resolved('1,23,456.78', '123456.78');
        resolved('1,23,45,678', '12345678');
        resolved('10,00,000', '1000000');
        resolved('1.23.456,78', '123456.78');
        ambiguous('1,2,456.78');
        ambiguous('1,23,45.78');
    });

    it('treats unicode group separators like a plain space', () => {
        resolved(`1${NBSP}234,56`, '1234.56');
        resolved(`1${NARROW_NBSP}234,56`, '1234.56');
        resolved(`1${THIN_SPACE}234,56`, '1234.56');
        resolved(`1${RIGHT_QUOTE}234.56`, '1234.56');
        resolved(`1${NBSP}234${NARROW_NBSP}567`, '1234567');
    });

    it('trims surrounding whitespace', () => {
        resolved('  1,5  ', '1.5');
        resolved(` ${NBSP}1 234,5`, '1234.5');
    });

    it('rejects non-grouping whitespace', () => {
        ambiguous('1\t2');
        ambiguous('1\n2');
        ambiguous('1  234,56');
        ambiguous('1 23,45');
        ambiguous('1 1,5');
    });

    it('rejects separators without digits around them', () => {
        ambiguous('.');
        ambiguous(',');
        ambiguous(',,');
        ambiguous('1,,2');
        ambiguous('1.,2');
    });

    it('drops leading zeros', () => {
        resolved('000,5', '0.5');
        resolved('00,123', '0.123');
        resolved('0,00', '0.00');
        resolved('0000', '0');
        resolved('0', '0');
    });

    it('keeps long fractions and integers beyond safe integer range', () => {
        resolved('0.0000000001', '0.0000000001');
        resolved('1234,56789012', '1234.56789012');
        resolved('12345678901234567890,5', '12345678901234567890.5');
        resolved('9,007,199,254,740,993', '9007199254740993');
    });

    it('rejects exponent notation', () => {
        ambiguous('1e3');
        ambiguous('1.5e-3');
        ambiguous('1E3');
    });

    it('rejects non-ascii digits', () => {
        ambiguous('\u0661\u0662\u0663');
        ambiguous('1\u066c234');
    });

    it('rejects three-digit tails that could be either grouping or decimals', () => {
        ambiguous('99,999');
        ambiguous('999,999');
        ambiguous('99.999');
        ambiguous('1,234,5');
    });
});

describe('NumberFormatter.normalizePastedInput locale invariance', () => {
    const locales = ['en-US', 'de-DE', 'hi-IN', 'fr-FR', 'ru-RU'];
    const inputs = [
        '',
        '0.123',
        '0,123',
        '1.234,56',
        '1,234.56',
        '1,23,456.78',
        '1 234 567',
        '1,00',
        '.5',
        '5.',
        '1,234',
        '1.234',
        '1.23,00',
        '-5',
        '1a2'
    ];

    const magnitudes = (locale: string) => {
        const numberFormatLocale = new WebNumberFormatLocale(locale);
        const localized = new NumberFormatter(numberFormatLocale, new Logger());

        return inputs.map(input => {
            const { value, status } = localized.normalizePastedInput(input);

            return { value: value.split(numberFormatLocale.decimalSeparator).join('.'), status };
        });
    };

    it('resolves the same magnitude regardless of the formatter locale', () => {
        const expected = magnitudes('en-US');

        for (const locale of locales) {
            expect(magnitudes(locale)).toEqual(expected);
        }
    });
});
