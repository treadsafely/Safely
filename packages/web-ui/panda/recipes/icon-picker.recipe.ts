import { defineSlotRecipe } from '@pandacss/dev';

export const iconPickerRecipe = defineSlotRecipe({
    className: 'iconPicker',
    description: 'Colour and emoji choices for a wallet icon',
    slots: ['root', 'grid', 'option', 'color', 'colorRing', 'emoji'],
    base: {
        root: {
            position: 'relative',
            flex: '1',
            minHeight: '0',
            overflowY: 'auto'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            justifyItems: 'center',
            gap: '12',
            paddingInline: '24',
            paddingBottom: '24'
        },
        option: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            padding: '0',
            borderWidth: '0',
            borderRadius: 'md',
            backgroundColor: 'transparent',
            cursor: 'pointer'
        },
        color: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: 'full',
            backgroundColor: 'var(--wallet-color)'
        },
        /* selection is a ring cut out of the swatch itself, in the swatch's own colour */
        colorRing: {
            width: '28px',
            height: '28px',
            borderRadius: 'full',
            borderWidth: '4px',
            borderStyle: 'solid',
            borderColor: 'background.primary',
            backgroundColor: 'var(--wallet-color)'
        },
        emoji: {
            fontSize: '28px',
            lineHeight: '32px'
        }
    },
    variants: {
        isHoverable: {
            true: {
                option: {
                    _hover: { backgroundColor: 'other.hover' }
                }
            }
        }
    }
});
