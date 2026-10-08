import { defineSlotRecipe } from '@pandacss/dev';

const tinted = {
    '& svg [fill]:not([fill="none"])': { fill: 'currentcolor' },
    '& svg [stroke]:not([stroke="none"])': { stroke: 'currentcolor' }
};

export const bannerRecipe = defineSlotRecipe({
    className: 'banner',
    description: 'Notice with an optional action, icon and dismiss button',
    slots: ['root', 'content', 'text', 'action', 'icon', 'close'],
    base: {
        root: {
            display: 'flex',
            alignItems: 'flex-start',
            width: '100%',
            overflow: 'hidden',
            borderRadius: 'sm'
        },
        content: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            flex: '1',
            minWidth: '0',
            paddingInline: '16',
            paddingBlock: '12'
        },
        text: {
            textStyle: 'bodyM',
            width: '100%'
        },
        action: {
            ...tinted,
            display: 'flex',
            alignItems: 'center',
            gap: '2',
            paddingTop: '4',
            background: 'none',
            borderWidth: '0',
            paddingInline: '0',
            paddingBottom: '0',
            textStyle: 'labelM',
            cursor: 'pointer'
        },
        icon: {
            ...tinted,
            display: 'flex',
            alignItems: 'center',
            alignSelf: 'center',
            flexShrink: 0,
            minHeight: '48px',
            paddingBlock: '8',
            paddingRight: '16'
        },
        close: {
            ...tinted,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            flexShrink: 0,
            padding: '16',
            background: 'none',
            borderWidth: '0',
            cursor: 'pointer'
        }
    },
    variants: {
        tone: {
            default: {
                root: { backgroundColor: 'banner.default.background' },
                text: { color: 'banner.default.foreground' },
                action: { color: 'banner.default.foreground' },
                icon: { color: 'icon.secondary' },
                close: { color: 'icon.secondary' }
            },
            warn: {
                root: { backgroundColor: 'banner.warn.background' },
                text: { color: 'banner.warn.foreground' },
                action: { color: 'banner.warn.foreground' },
                icon: { color: 'banner.warn.foreground' },
                close: { color: 'banner.warn.foreground' }
            },
            danger: {
                root: { backgroundColor: 'banner.danger.background' },
                text: { color: 'banner.danger.foreground' },
                action: { color: 'banner.danger.foreground' },
                icon: { color: 'banner.danger.foreground' },
                close: { color: 'banner.danger.foreground' }
            }
        },
        isInteractive: {
            true: {
                root: {
                    position: 'relative',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderWidth: '0',
                    padding: '0',
                    _before: {
                        content: '""',
                        position: 'absolute',
                        inset: '0',
                        backgroundColor: 'transparent'
                    },
                    _hover: {
                        _before: { backgroundColor: 'other.hover' }
                    },
                    _active: {
                        _before: { backgroundColor: 'other.transparentElement' }
                    }
                }
            }
        }
    },
    defaultVariants: {
        tone: 'default'
    }
});
