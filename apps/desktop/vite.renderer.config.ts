import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

/* These ship TypeScript source rather than a build artefact; prebundling them resolves stale copies
   and breaks HMR. */
const WORKSPACE_SOURCE_PACKAGES = [
    '@safely/core',
    '@safely/slottree',
    '@safely/sync',
    '@safely/sync-storage',
    '@safely/ux',
    '@safely/web-ui',
    '@safely/xhr-event-source'
];

/* Panda is not wired here: it runs as a PostCSS plugin from `postcss.config.cjs`. */
export default defineConfig({
    plugins: [react(), svgr({ include: '**/*.svg?react' })],
    resolve: {
        /* a second React instance would break hooks in the shared packages */
        dedupe: ['react', 'react-dom'],

        /* Overrides electron-forge's default `true`, which does not survive pnpm: every workspace
           package would resolve inside its own `node_modules`, instantiating react twice, and the
           shared stylesheet would look like a node_modules file to Panda's PostCSS plugin, which
           skips those. */
        preserveSymlinks: false
    },
    optimizeDeps: {
        exclude: WORKSPACE_SOURCE_PACKAGES
    }
});
