import { defineSlotRecipe } from '@pandacss/dev';

export const tableCellRecipe = defineSlotRecipe({
    className: 'tableCell',
    description: 'Label and value row of a details table',
    slots: ['root', 'column', 'label', 'value', 'valueText', 'actions', 'action', 'copied'],
    base: {
        root: {
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8',
            width: '100%',
            paddingInline: '16',
            paddingBlock: '12',
            textAlign: 'left',
            borderWidth: '0',
            backgroundColor: 'background.secondary',
            overflow: 'hidden'
        },
        column: {
            display: 'flex',
            flexDirection: 'column',
            flex: '1',
            minWidth: '0'
        },
        label: {
            textStyle: 'bodyM',
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        },
        value: {
            display: 'flex',
            alignItems: 'center',
            gap: '6',
            minWidth: '0',
            textStyle: 'bodyM',
            color: 'text.primary'
        },
        valueText: {
            minWidth: '0',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        },
        actions: {
            display: 'flex',
            alignItems: 'center',
            alignSelf: 'stretch',
            flexShrink: 0,
            gap: '16',
            marginLeft: '8'
        },
        action: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
            borderWidth: '0',
            backgroundColor: 'transparent',
            color: 'icon.secondary',
            cursor: 'pointer',
            _hover: { color: 'icon.primary' }
        },
        copied: {
            position: 'absolute',
            top: '0',
            right: '0',
            bottom: '0',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '24',
            paddingRight: '16',
            textStyle: 'labelM',
            color: 'text.primary',
            backgroundColor: 'background.secondary',
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity 180ms',
            _before: {
                content: '""',
                position: 'absolute',
                top: '0',
                bottom: '0',
                right: '100%',
                width: '16px',
                backgroundImage:
                    'linear-gradient(to right, transparent, token(colors.background.secondary))'
            }
        }
    },
    variants: {
        isCopyable: {
            true: {
                root: { cursor: 'pointer' }
            }
        },
        isCopied: {
            true: {
                copied: { opacity: 1 }
            }
        },
        hasColumnDivider: {
            true: {
                root: {
                    paddingInline: '0',
                    paddingBlock: '0',
                    gap: '0'
                },
                column: {
                    justifyContent: 'center',
                    paddingInline: '16',
                    paddingBlock: '12',
                    '& + &': {
                        borderLeftWidth: 'hairline',
                        borderLeftStyle: 'solid',
                        borderLeftColor: 'other.transparentElement'
                    }
                }
            }
        }
    }
});
