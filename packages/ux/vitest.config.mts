import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@safely/core': path.resolve(import.meta.dirname, '../core/src')
        }
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./test/setup-crypto.ts']
    }
});
