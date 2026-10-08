import { defineSlotRecipe } from '@pandacss/dev';

export const switchRecipe = defineSlotRecipe({
    className: 'switch',
    description: 'Track and thumb on/off control',
    slots: ['root', 'thumb'],
    base: {
        root: {
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            width: '48px',
            height: '24px',
            padding: '2px',
            borderWidth: '0',
            borderRadius: 'xs',
            backgroundColor: 'background.tertiary',
            transition: 'background-color 180ms',
            cursor: 'pointer',
            _checked: {
                backgroundColor: 'accent.accent'
            },
            _disabled: {
                cursor: 'not-allowed',
                opacity: 0.56
            }
        },
        thumb: {
            width: '24px',
            height: '20px',
            borderRadius: 'xss',
            backgroundColor: 'other.constant.white',
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15), 0 3px 1px rgba(0, 0, 0, 0.06)',
            transition: 'transform 180ms',
            _checked: {
                transform: 'translateX(20px)'
            }
        }
    }
});
