import { defineRecipe } from '@pandacss/dev';

const tinted = {
    color: 'currentcolor',
    '&& [fill]:not([fill="none"])': { fill: 'currentcolor' },
    '&& [stroke]:not([stroke="none"])': { stroke: 'currentcolor' }
};

export const iconRecipe = defineRecipe({
    className: 'icon',
    description: 'Icon asset, optionally tinted',
    base: {
        display: 'block',
        flexShrink: 0
    },
    variants: {
        tone: {
            primary: { ...tinted, color: 'icon.primary' },
            secondary: { ...tinted, color: 'icon.secondary' },
            tertiary: { ...tinted, color: 'icon.tertiary' },
            accent: { ...tinted, color: 'accent.accent' },
            accentRed: { ...tinted, color: 'accent.red' },
            accentGreen: { ...tinted, color: 'accent.green' },
            accentOrange: { ...tinted, color: 'accent.orange' },
            constantBlack: { ...tinted, color: 'other.constant.black' },
            constantWhite: { ...tinted, color: 'other.constant.white' },
            inherit: tinted
        }
    }
});
