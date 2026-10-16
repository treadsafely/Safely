import { defineRecipe } from '@pandacss/dev';

export const toastRecipe = defineRecipe({
    className: 'toast',
    description: 'Transient message floating over the content it belongs to',
    base: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8',
        maxWidth: '374px',
        paddingInline: '16',
        paddingBlock: '8',
        borderRadius: 'sm',
        textStyle: 'labelM',
        textAlign: 'center'
    },
    variants: {
        variant: {
            default: {
                borderWidth: 'hairline',
                borderStyle: 'solid',
                borderColor: 'other.transparentElement',
                backgroundColor: 'button.tertiary.background',
                color: 'text.primary'
            },
            white: {
                backgroundColor: 'other.constant.white',
                color: 'other.constant.black',
                boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.24)'
            }
        }
    },
    defaultVariants: {
        variant: 'default'
    }
});
