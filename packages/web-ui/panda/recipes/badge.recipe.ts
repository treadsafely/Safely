import { defineRecipe } from '@pandacss/dev';

export const badgeRecipe = defineRecipe({
    className: 'badge',
    description: 'Small label attached to a title',
    base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        minWidth: '18px',
        paddingInline: '4',
        paddingBlock: '1px',
        borderRadius: 'xss',
        textStyle: 'bodyS',
        whiteSpace: 'nowrap'
    },
    variants: {
        tone: {
            neutral: {
                backgroundColor: 'badge.neutral.background',
                color: 'badge.neutral.foreground'
            },
            accent: {
                backgroundColor: 'badge.accent.background',
                color: 'badge.accent.foreground'
            },
            warning: {
                backgroundColor: 'badge.warning.background',
                color: 'badge.warning.foreground'
            },
            success: {
                backgroundColor: 'badge.success.background',
                color: 'badge.success.foreground'
            },
            error: {
                backgroundColor: 'badge.error.background',
                color: 'badge.error.foreground'
            },
            warningFilled: {
                backgroundColor: 'badge.warningFilled.background',
                color: 'badge.warningFilled.foreground'
            }
        },
        isUppercase: {
            true: {
                textTransform: 'uppercase'
            }
        }
    },
    defaultVariants: {
        tone: 'neutral'
    }
});
