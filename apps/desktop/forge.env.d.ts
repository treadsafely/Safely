/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

/* Replaced only in the main bundle: a renderer read compiles and throws at runtime. */
declare const SAFELY_BUILD_NUMBER: string | null;
