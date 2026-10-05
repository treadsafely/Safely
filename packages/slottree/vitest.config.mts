import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // vitest 4, unlike 0.34, applies this to sync tests — the fast-check suites need it.
        testTimeout: 120_000
    }
});
