import { describe, expect, it } from 'vitest';

import {
    parseFlameDevnetSeedParam,
    parseFlameDevnetWalletNameParam
} from '../../../src/features/portfolio-flow/flame-devnet-portfolio';

const WORDS = 'friend north art fix rail decorate nominee oil script physical ordinary panic';

describe('parseFlameDevnetSeedParam', () => {
    it('reads a quoted, space-separated phrase', () => {
        expect(parseFlameDevnetSeedParam(`"${WORDS}"`)).toEqual(WORDS.split(' '));
    });

    it('reads words joined with `+` and extra whitespace, in any case', () => {
        expect(parseFlameDevnetSeedParam(`  ${WORDS.toUpperCase().replaceAll(' ', '+')} `)).toEqual(
            WORDS.split(' ')
        );
    });

    it('returns nothing for an empty param', () => {
        expect(parseFlameDevnetSeedParam('')).toEqual([]);
    });
});

describe('parseFlameDevnetWalletNameParam', () => {
    it('drops control and invisible characters and trims', () => {
        expect(parseFlameDevnetWalletNameParam(' \u202EFlame\u200B demo\n')).toBe('Flame demo');
    });

    it('cuts to the wallet name limit', () => {
        expect(parseFlameDevnetWalletNameParam('a'.repeat(30))).toBe('a'.repeat(24));
    });

    it('returns nothing for an empty or blank param', () => {
        expect(parseFlameDevnetWalletNameParam('')).toBeUndefined();
        expect(parseFlameDevnetWalletNameParam(' \u200D ')).toBeUndefined();
    });
});
