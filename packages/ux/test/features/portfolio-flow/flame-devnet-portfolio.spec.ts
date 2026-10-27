import { describe, expect, it } from 'vitest';

import { parseFlameDevnetSeedParam } from '../../../src/features/portfolio-flow/flame-devnet-portfolio';

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
