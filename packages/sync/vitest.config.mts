import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@safely/slottree': resolve(import.meta.dirname, '../slottree/src')
        }
    },
    test: {
        setupFiles: ['./tests/setup.ts']
    }
});
