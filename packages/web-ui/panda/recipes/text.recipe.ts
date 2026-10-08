import { defineRecipe } from '@pandacss/dev';

export const textRecipe = defineRecipe({
    className: 'text',
    description: 'The shared type scale',
    base: {
        margin: '0'
    },
    variants: {
        variant: {
            displayL: { textStyle: 'displayL' },
            titleL: { textStyle: 'titleL' },
            titleM: { textStyle: 'titleM' },
            titleS: { textStyle: 'titleS' },
            labelL: { textStyle: 'labelL' },
            labelM: { textStyle: 'labelM' },
            labelS: { textStyle: 'labelS' },
            bodyL: { textStyle: 'bodyL' },
            bodyLMono: { textStyle: 'bodyLMono', fontFamily: 'ui-monospace, monospace' },
            bodyM: { textStyle: 'bodyM' },
            bodyS: { textStyle: 'bodyS' }
        },
        tone: {
            primary: { color: 'text.primary' },
            secondary: { color: 'text.secondary' },
            tertiary: { color: 'text.tertiary' },
            link: { color: 'text.link' },
            accentRed: { color: 'accent.red' },
            accentGreen: { color: 'accent.green' },
            accentOrange: { color: 'accent.orange' },
            constantBlack: { color: 'other.constant.black' },
            constantWhite: { color: 'other.constant.white' },
            inherit: { color: 'inherit' }
        },
        align: {
            left: { textAlign: 'left' },
            center: { textAlign: 'center' },
            right: { textAlign: 'right' }
        },
        isTruncated: {
            true: {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }
        },
        isTabular: {
            true: {
                fontVariantNumeric: 'tabular-nums lining-nums'
            }
        }
    },
    defaultVariants: {
        variant: 'bodyM',
        tone: 'primary'
    }
});
