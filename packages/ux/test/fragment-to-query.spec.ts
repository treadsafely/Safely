import { describe, expect, it } from 'vitest';

import { fragmentToQuery } from '../src/shared/linking/fragment-to-query';

describe('fragmentToQuery', () => {
    it('keeps a path without a fragment', () => {
        expect(fragmentToQuery('import-flame-devnet-wallet?testseed=a+b')).toBe(
            'import-flame-devnet-wallet?testseed=a+b'
        );
    });

    it('turns the fragment into the query', () => {
        expect(fragmentToQuery('import-flame-devnet-wallet#testseed=a+b')).toBe(
            'import-flame-devnet-wallet?testseed=a+b'
        );
    });

    it('appends the fragment to an existing query', () => {
        expect(fragmentToQuery('import-flame-devnet-wallet?x=1#testseed=a%20b')).toBe(
            'import-flame-devnet-wallet?x=1&testseed=a%20b'
        );
    });

    it('drops an empty fragment', () => {
        expect(fragmentToQuery('import-flame-devnet-wallet#')).toBe('import-flame-devnet-wallet');
    });

    it('works on a full url', () => {
        expect(fragmentToQuery('safely:///import-flame-devnet-wallet#testseed=a+b')).toBe(
            'safely:///import-flame-devnet-wallet?testseed=a+b'
        );
    });
});
