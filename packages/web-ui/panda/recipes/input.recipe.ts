import { defineSlotRecipe } from '@pandacss/dev';

export const inputRecipe = defineSlotRecipe({
    className: 'input',
    description: 'Labelled text field',
    slots: [
        'root',
        'label',
        'wrapper',
        'field',
        'content',
        'control',
        'adornment',
        'action',
        'description'
    ],
    base: {
        root: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%'
        },
        label: {
            display: 'flex',
            alignItems: 'center',
            paddingTop: '12',
            paddingInline: '16',
            textStyle: 'bodyM',
            color: 'text.tertiary'
        },
        wrapper: {
            display: 'flex',
            flexDirection: 'column',
            padding: '8'
        },
        field: {
            display: 'flex',
            alignItems: 'stretch',
            overflow: 'hidden',
            backgroundColor: 'input.background',
            borderRadius: 'sm',
            borderStyle: 'solid',
            borderWidth: 'hairline',
            borderColor: 'background.tertiary',
            transition: 'border-color 150ms, box-shadow 150ms',
            cursor: 'text',
            _focusWithin: {
                borderColor: 'input.focused.border',
                boxShadow: 'inset 0 0 0 0.5px token(colors.input.focused.border)'
            },
            '[data-invalid] &, [data-invalid] &:focus-within': {
                borderColor: 'input.error.border',
                boxShadow: 'inset 0 0 0 0.5px token(colors.input.error.border)'
            },
            '[data-disabled] &': {
                opacity: 0.64,
                cursor: 'not-allowed'
            }
        },
        content: {
            display: 'flex',
            alignItems: 'center',
            flex: '1',
            minWidth: '0',
            padding: 'calc(token(spacing.16) - token(borderWidths.hairline))'
        },
        control: {
            flex: '1',
            minWidth: '0',
            textStyle: 'bodyL',
            color: 'text.primary',
            caretColor: 'accent.accent',
            backgroundColor: 'transparent',
            borderWidth: '0',
            padding: '0',
            outline: 'none',
            resize: 'none',
            fieldSizing: 'content',
            cursor: 'text',
            _placeholder: {
                color: 'text.tertiary'
            },
            _disabled: {
                cursor: 'not-allowed'
            }
        },
        adornment: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'stretch',
            flexShrink: 0,
            width: '56px'
        },
        action: {
            background: 'none',
            borderWidth: '0',
            padding: '0',
            color: 'icon.tertiary',
            cursor: 'pointer'
        },
        description: {
            paddingInline: '16',
            textStyle: 'bodyM',
            color: 'text.tertiary'
        }
    },
    variants: {
        isMultiline: {
            true: {
                content: {
                    flexDirection: 'column',
                    alignItems: 'stretch'
                }
            }
        }
    }
});
