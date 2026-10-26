import { describe, expect, it } from 'vitest';

import { WebNumberFormatLocale } from '@safely/core';

import { resolveCaret, sanitizeAmount } from '../../../src/features/send/amount-mask';

const enUs = new WebNumberFormatLocale('en-US');
const ruRu = new WebNumberFormatLocale('ru-RU');

const type = (input: string, decimals = 8, locale = enUs): string =>
    sanitizeAmount(input, { locale, decimals });

describe('sanitizeAmount', () => {
    it('drops anything that is not a digit or a separator', () => {
        expect(type('12abc3')).toBe('123');
        expect(type('-1 2e3')).toBe('123');
    });

    it('takes the first separator as the decimal point, whichever key it was', () => {
        expect(type('1,5')).toBe('1.5');
        expect(type('0.5', 8, ruRu)).toBe('0,5');
    });

    it('ignores a repeat of the same separator', () => {
        expect(type('1.5.')).toBe('1.5');
    });

    it('clears the value when a second, different separator conflicts with the first', () => {
        expect(type('1.5,')).toBe('');
        expect(type('1,000.5')).toBe('');
    });

    it('has no grouping, so a grouped amount reads as a fraction', () => {
        expect(type('1,000')).toBe('1.000');
    });

    it('drops digits typed past the asset precision', () => {
        expect(type('1.23456789012')).toBe('1.23456789');
        expect(type('1.239', 2)).toBe('1.23');
    });

    it('refuses a separator when the asset has no fraction', () => {
        expect(type('1.2', 0)).toBe('12');
    });

    it('collapses leading zeros and keeps a lone zero', () => {
        expect(type('007')).toBe('7');
        expect(type('0')).toBe('0');
        expect(type('00.5')).toBe('0.5');
    });

    it('starts the fraction of a zero when the separator opens an empty field', () => {
        expect(type('.')).toBe('0.');
        expect(type(',', 8, ruRu)).toBe('0,');
    });
});

describe('resolveCaret', () => {
    it('keeps the caret in place when nothing was dropped', () => {
        expect(resolveCaret({ typed: '123', sanitized: '123', caret: 2 })).toBe(2);
    });

    it('moves the caret back by what the field refused', () => {
        expect(resolveCaret({ typed: '12a3', sanitized: '123', caret: 3 })).toBe(2);
    });
});
