import { defineRecipe } from '@pandacss/dev';

export const colorDotRecipe = defineRecipe({
    className: 'colorDot',
    description: 'Round swatch standing for a wallet colour',
    base: {
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        borderRadius: 'full'
    },
    variants: {
        tone: {
            lightGray: { backgroundColor: 'wallet.lightGray' },
            red: { backgroundColor: 'wallet.red' },
            orange: { backgroundColor: 'wallet.orange' },
            green: { backgroundColor: 'wallet.green' },
            blue: { backgroundColor: 'wallet.blue' },
            aquamarine: { backgroundColor: 'wallet.aquamarine' },
            purple: { backgroundColor: 'wallet.purple' },
            magneta: { backgroundColor: 'wallet.magneta' }
        },
        size: {
            small: { width: '12px', height: '12px' },
            medium: { width: '16px', height: '16px' }
        }
    },
    defaultVariants: {
        tone: 'blue',
        size: 'medium'
    }
});
