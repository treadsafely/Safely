import { defineSlotRecipe } from '@pandacss/dev';

export const checkboxRecipe = defineSlotRecipe({
    className: 'checkbox',
    description: 'Square on/off control',
    slots: ['root', 'indicator'],
    base: {
        root: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: '24px',
            height: '24px',
            padding: '0',
            borderRadius: 'xs',
            borderWidth: 'hairline',
            borderStyle: 'solid',
            borderColor: 'other.transparentElement',
            backgroundColor: 'background.tertiary',
            transition: 'background-color 150ms, border-color 150ms',
            cursor: 'pointer',
            _checked: {
                backgroundColor: 'accent.accent',
                borderColor: 'accent.accent'
            },
            _disabled: {
                cursor: 'not-allowed',
                opacity: 0.64
            }
        },
        indicator: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'other.constant.white',
            '& svg [fill]:not([fill="none"])': { fill: 'currentcolor' },
            '& svg [stroke]:not([stroke="none"])': { stroke: 'currentcolor' }
        }
    }
});
