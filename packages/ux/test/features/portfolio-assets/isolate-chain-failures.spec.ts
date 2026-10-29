import { describe, expect, it } from 'vitest';

import type { RatedCryptoAssetAmount } from '@safely/core';

import { isolateChainFailures } from '../../../src/features/portfolio-assets/portfolio-assets';
import type { DerivedQueryResult } from '../../../src/shared/query-core/types';

type ChainQuery = DerivedQueryResult<RatedCryptoAssetAmount | null>;

const rated = {} as RatedCryptoAssetAmount;

const query = (overrides: Partial<ChainQuery>): ChainQuery => ({
    data: undefined,
    isError: false,
    isSuccess: false,
    isPending: true,
    isFetching: false,
    error: null,
    dataUpdatedAt: 0,
    refetch: () => Promise.resolve(),
    ...overrides
});

const loaded = query({ data: rated, isSuccess: true, isPending: false });
const absent = query({ data: null, isSuccess: true, isPending: false });
const pending = query({});
const failed = query({ isError: true, isPending: false, error: new Error('node down') });
const failedWithCache = query({ data: rated, isError: true, isPending: false });

describe('isolateChainFailures', () => {
    it('settles a failed chain as absent while another chain is loaded', () => {
        const [btc, flame] = isolateChainFailures([loaded, failed]);

        expect(btc).toBe(loaded);
        expect(flame).toMatchObject({ data: null, isSuccess: true, isError: false });
    });

    it('keeps the cached data of a chain whose refetch failed', () => {
        const [, flame] = isolateChainFailures([loaded, failedWithCache]);

        expect(flame).toMatchObject({ data: rated, isSuccess: true, isError: false });
    });

    it('still waits for a pending chain next to a failed one', () => {
        const [btc, flame] = isolateChainFailures([pending, failed]);

        expect(btc).toBe(pending);
        expect(flame.isSuccess).toBe(true);
    });

    it('leaves the failure in place when it is the only chain', () => {
        const queries = [failed, absent];

        expect(isolateChainFailures(queries)).toBe(queries);
    });
});
