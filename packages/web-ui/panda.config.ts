import { defineConfig } from '@pandacss/dev';

import { commonTheme, darkTheme } from '@safely/ux/theme';

import { recipes, slotRecipes } from './panda/recipes';
import { px, raw, toTextStyles, toTokens } from './panda/tokens';

const SYSTEM_FONT_STACK =
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif';

/**
 * The only Panda instance in the monorepo: `include` covers the apps, `importMap` lets them
 * import the generated helpers as `@safely/web-ui/styled-system/*`, and their PostCSS config
 * points back here. Never add a second config.
 */
export default defineConfig({
    preflight: true,
    outdir: 'styled-system',
    importMap: '@safely/web-ui/styled-system',
    cwd: __dirname,
    include: ['./src/**/*.{ts,tsx}', '../../apps/*/src/**/*.{ts,tsx}'],
    exclude: [],
    jsxFramework: 'react',
    jsxStyleProps: 'all',
    conditions: {
        extend: {
            /* Base UI exposes component state as data attributes; these are how to style it. */
            dark: '[data-theme=dark] &',
            open: '&[data-open], &[data-popup-open]',
            highlighted: '&[data-highlighted]',
            selected: '&[data-selected]',
            enter: '&[data-starting-style]',
            exit: '&[data-ending-style]'
        }
    },
    staticCss: {
        recipes: {
            appLayout: ['*'],
            badge: ['*'],
            banner: ['*'],
            button: ['*'],
            cell: ['*'],
            checkbox: ['*'],
            colorDot: ['*'],
            list: ['*'],
            modal: ['*'],
            pageHeader: ['*'],
            passcode: ['*'],
            tableCell: ['*'],
            toggle: ['*'],
            icon: ['*'],
            iconPicker: ['*'],
            spinner: ['*'],
            input: ['*'],
            text: ['*'],
            toast: ['*']
        }
    },
    utilities: {
        extend: {
            appRegion: {
                className: 'app-region',
                values: ['drag', 'no-drag'],
                transform: (value: string) => ({ '-webkit-app-region': value })
            }
        }
    },
    theme: {
        extend: {
            tokens: {
                radii: toTokens(commonTheme.radius, px),
                spacing: toTokens(commonTheme.spacing, px),
                borderWidths: toTokens(commonTheme.border, px),
                zIndex: {
                    loader: { value: '10' },
                    passcodePrompt: { value: '20' },
                    toast: { value: '30' }
                }
            },
            semanticTokens: {
                /* Dark-only today. A light palette makes the mapper emit `{ base, _dark }`
                   values; token paths stay the same, so no component changes. */
                colors: toTokens(darkTheme.colors, raw)
            },
            textStyles: toTextStyles(commonTheme.typography),
            keyframes: {
                spin: {
                    to: { transform: 'rotate(360deg)' }
                },
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-8px)' },
                    '75%': { transform: 'translateX(8px)' }
                },
                pulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.4' }
                }
            },
            recipes,
            slotRecipes
        }
    },
    globalCss: {
        ':root': {
            colorScheme: 'dark'
        },
        'html, body, #root': {
            height: '100%'
        },
        body: {
            backgroundColor: 'background.primary',
            color: 'text.primary',
            fontFamily: SYSTEM_FONT_STACK,
            WebkitFontSmoothing: 'antialiased'
        }
    }
});
