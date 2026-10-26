import path from 'path';
import svgr from 'vite-plugin-svgr';
import type { ViteUserConfig } from 'vitest/config';
import { defineConfig } from 'vitest/config';

type VitestPlugin = NonNullable<ViteUserConfig['plugins']>[number];

export default defineConfig({
    /* The cast bridges two vite type versions: the plugin is typed against the catalog's vite 6
       (pinned by electron-forge), vitest 4 carries vite 7. The runtime plugin API is the same. */
    plugins: [svgr({ include: '**/*.svg?react' }) as VitestPlugin],
    resolve: {
        alias: {
            /* Panda's generated helpers are imported through this package's own name
               (`importMap` in panda.config.ts). Self-referencing exports are resolved
               by the apps but not when vitest runs inside this package. */
            '@safely/web-ui/styled-system': path.resolve(__dirname, 'styled-system')
        }
    },
    test: {
        globals: true,
        environment: 'happy-dom'
    }
});
