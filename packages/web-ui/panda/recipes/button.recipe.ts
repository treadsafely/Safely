import { defineRecipe } from '@pandacss/dev';

/* Recipes live outside `src`: `defineRecipe` is config-time, and calling it from source is
   an eslint error (`@pandacss/no-config-function-in-source`). */
export const buttonRecipe = defineRecipe({
    className: 'button',
    description: 'Primary action button',
    base: {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'sm',
        borderWidth: '0',
        cursor: 'pointer',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        _focusVisible: {
            outline: '2px solid',
            outlineColor: 'input.focused.border',
            outlineOffset: '2px'
        },

        '& svg [fill]:not([fill="none"])': { fill: 'currentcolor' },
        '& svg [stroke]:not([stroke="none"])': { stroke: 'currentcolor' },

        _before: {
            content: '""',
            position: 'absolute',
            inset: '0',
            borderRadius: 'inherit',
            backgroundColor: 'transparent'
        },
        _hover: {
            _before: {
                backgroundColor: 'other.hover'
            }
        },
        _disabled: {
            cursor: 'not-allowed',
            opacity: 0.64,
            _before: {
                backgroundColor: 'transparent'
            }
        }
    },
    variants: {
        variant: {
            primary: {
                backgroundColor: 'button.primary.background',
                color: 'button.primary.foreground'
            },
            secondary: {
                backgroundColor: 'button.secondary.background',
                color: 'button.secondary.foreground'
            },
            tertiary: {
                backgroundColor: 'button.tertiary.background',
                color: 'button.tertiary.foreground'
            },
            overlay: {
                backgroundColor: 'other.constant.white',
                color: 'other.constant.black'
            },
            accent: {
                backgroundColor: 'accent.blue/8',
                color: 'text.link',
                borderWidth: 'hairlineAlternate',
                borderStyle: 'solid',
                borderColor: 'accent.blue/20'
            },
            destructive: {
                backgroundColor: 'button.destructive.background',
                color: 'button.destructive.foreground'
            },
            destructiveOrange: {
                backgroundColor: 'button.destructiveOrange.background',
                color: 'button.destructiveOrange.foreground'
            }
        },
        size: {
            xsmall: {
                textStyle: 'labelM',
                gap: '6',
                paddingInline: '12',
                minHeight: '40px'
            },
            small: {
                textStyle: 'labelM',
                gap: '6',
                paddingInline: '16',
                paddingBlock: '8',
                minHeight: '36px'
            },
            medium: {
                textStyle: 'labelL',
                gap: '8',
                paddingInline: '24',
                paddingBlock: '12',
                minHeight: '48px'
            },
            large: {
                textStyle: 'labelL',
                gap: '8',
                paddingInline: '24',
                paddingBlock: '16',
                minHeight: '56px'
            }
        },
        isFullWidth: {
            true: {
                width: '100%'
            }
        },
        isIconOnly: {
            true: {}
        },
        isRound: {
            true: {
                borderRadius: 'full'
            }
        },
        isLoading: {
            true: {
                cursor: 'progress'
            }
        }
    },
    compoundVariants: [
        {
            size: 'xsmall',
            isIconOnly: true,
            css: { paddingInline: '0', width: '40px', height: '40px' }
        },
        {
            size: 'small',
            isIconOnly: true,
            css: { paddingInline: '0', width: '36px', height: '36px' }
        },
        {
            size: 'medium',
            isIconOnly: true,
            css: { paddingInline: '0', width: '48px', height: '48px' }
        },
        {
            size: 'large',
            isIconOnly: true,
            css: { paddingInline: '0', width: '56px', height: '56px' }
        }
    ],
    defaultVariants: {
        variant: 'primary',
        size: 'large'
    }
});
