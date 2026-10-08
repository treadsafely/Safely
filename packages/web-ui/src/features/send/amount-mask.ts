import type { NumberFormatLocale } from '@safely/core';

export type AmountMaskOptions = {
    locale: NumberFormatLocale;
    decimals: number;
};

const DIGITS = /\d/;
const SEPARATORS = ['.', ','];

export function sanitizeAmount(input: string, options: AmountMaskOptions): string {
    const { locale, decimals } = options;

    let integer = '';
    let fraction = '';
    let separator: string | undefined;

    for (const character of input) {
        if (DIGITS.test(character)) {
            if (separator === undefined) {
                integer += character;
            } else if (fraction.length < decimals) {
                fraction += character;
            }

            continue;
        }

        const isSeparator =
            decimals > 0 &&
            (character === locale.decimalSeparator || SEPARATORS.includes(character));

        if (!isSeparator) {
            continue;
        }

        if (separator === undefined) {
            separator = character;
            continue;
        }

        if (character !== separator) {
            return '';
        }
    }

    const trimmedInteger = integer.replace(/^0+(?=\d)/, '');

    if (separator === undefined) {
        return trimmedInteger;
    }

    return `${trimmedInteger === '' ? '0' : trimmedInteger}${locale.decimalSeparator}${fraction}`;
}

export function resolveCaret(params: { typed: string; sanitized: string; caret: number }): number {
    const { typed, sanitized, caret } = params;

    return Math.max(0, caret - (typed.length - sanitized.length));
}
