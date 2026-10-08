import { defineSlotRecipe } from '@pandacss/dev';

export const passcodeRecipe = defineSlotRecipe({
    className: 'passcode',
    description: 'Passcode entry: the filled/empty digit boxes and the numeric keypad',
    slots: ['root', 'boxes', 'box', 'dot', 'keypad', 'row', 'key'],
    base: {
        root: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
        },
        boxes: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8',
            paddingInline: '16',
            paddingTop: '12',
            paddingBottom: '16',
            width: '100%'
        },
        box: {
            position: 'relative',
            width: '44px',
            height: '44px',
            borderRadius: 'sm',
            borderWidth: 'hairline',
            borderStyle: 'solid',
            borderColor: 'other.transparentElement',
            backgroundColor: 'input.background'
        },
        dot: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '16px',
            height: '16px',
            borderRadius: 'full',
            backgroundColor: 'icon.primary'
        },
        keypad: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            padding: '24'
        },
        row: {
            display: 'flex',
            alignItems: 'center',
            width: '100%'
        },
        key: {
            display: 'flex',
            flex: '1',
            minWidth: '0',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16',
            minHeight: '72px',
            borderWidth: '0',
            borderRadius: 'md',
            backgroundColor: 'transparent',
            color: 'text.primary',
            textStyle: 'displayL',
            fontSize: '32px',
            lineHeight: '40px',
            cursor: 'pointer',
            userSelect: 'none',
            outline: 'none',
            WebkitTapHighlightColor: 'transparent',

            '& svg [fill]:not([fill="none"])': { fill: 'currentcolor' },

            _focusVisible: { outline: 'none' },
            _disabled: { cursor: 'default', opacity: 0 }
        }
    },
    variants: {
        isInvalid: {
            true: {
                root: { animation: 'shake 400ms' },
                box: { borderColor: 'input.error.border' }
            }
        }
    }
});
