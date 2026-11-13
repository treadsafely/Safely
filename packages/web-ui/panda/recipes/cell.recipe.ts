import { defineSlotRecipe } from '@pandacss/dev';

const tinted = {
    '& svg [fill]:not([fill="none"])': { fill: 'currentcolor' },
    '& svg [stroke]:not([stroke="none"])': { stroke: 'currentcolor' }
};

export const cellRecipe = defineSlotRecipe({
    className: 'cell',
    description: 'One row of a list',
    slots: [
        'root',
        'leading',
        'content',
        'row',
        'title',
        'subtitle',
        'value',
        'subvalue',
        'trailing'
    ],
    base: {
        root: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            minHeight: '48px',
            paddingLeft: '16',
            textAlign: 'left',
            borderWidth: '0',
            _focusVisible: {
                outline: '2px solid',
                outlineColor: 'input.focused.border',
                outlineOffset: '-2px'
            }
        },
        leading: {
            ...tinted,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            paddingRight: '12'
        },
        content: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: '1',
            minWidth: '0',
            paddingBlock: '10px',
            paddingRight: '16'
        },
        row: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8'
        },
        title: {
            textStyle: 'labelL',
            minWidth: '0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
        },
        subtitle: {
            textStyle: 'bodyM',
            color: 'text.tertiary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
        },
        value: {
            textStyle: 'bodyL',
            color: 'text.tertiary',
            flexShrink: 0,
            whiteSpace: 'nowrap'
        },
        subvalue: {
            textStyle: 'bodyM',
            color: 'text.tertiary',
            whiteSpace: 'nowrap'
        },
        trailing: {
            ...tinted,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            paddingRight: '16',
            color: 'icon.tertiary'
        }
    },
    variants: {
        tone: {
            default: {
                root: { backgroundColor: 'cell.default.background' },
                title: { color: 'cell.default.foreground' }
            },
            transparent: {
                root: { backgroundColor: 'transparent' },
                title: { color: 'cell.default.foreground' }
            },
            tertiary: {
                root: { backgroundColor: 'background.tertiary' },
                title: { color: 'cell.default.foreground' }
            },
            accentRed: {
                root: { backgroundColor: 'cell.accentRed.background', textAlign: 'center' },
                title: { color: 'cell.accentRed.foreground' },
                trailing: { color: 'cell.accentRed.foreground' }
            }
        },
        size: {
            compact: {
                root: { minHeight: '36px', paddingLeft: '8' },
                leading: { paddingRight: '8' },
                content: { paddingBlock: '8', paddingRight: '8' },
                title: { textStyle: 'labelM' },
                value: { textStyle: 'bodyM' },
                trailing: { paddingRight: '8' }
            }
        },
        isSelected: {
            true: {
                root: {
                    backgroundColor: 'background.tertiary',
                    borderRadius: 'sm'
                }
            }
        },
        isInteractive: {
            true: {
                root: {
                    cursor: 'pointer',
                    _before: {
                        content: '""',
                        position: 'absolute',
                        inset: '0',
                        backgroundColor: 'transparent'
                    },
                    _hover: {
                        _before: { backgroundColor: 'other.hover' }
                    }
                }
            }
        }
    },
    defaultVariants: {
        tone: 'default'
    }
});
