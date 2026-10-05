import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@mobile/shared': fileURLToPath(new URL('./src/shared', import.meta.url))
        }
    }
});
