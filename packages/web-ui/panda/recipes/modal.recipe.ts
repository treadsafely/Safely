import { defineSlotRecipe } from '@pandacss/dev';

export const modalRecipe = defineSlotRecipe({
    className: 'modal',
    description: 'Centred dialog over the whole window',
    slots: [
        'backdrop',
        'popup',
        'header',
        'headerTitle',
        /* layout only: the button recipe in `Modal.tsx` paints the header's close button */
        'headerClose',
        'content',
        'title',
        'description',
        'actions'
    ],
    base: {
        backdrop: {
            position: 'fixed',
            inset: '0',
            backgroundColor: 'background.overlay',
            backdropFilter: 'blur(8px)',
            opacity: 0,
            transition: 'opacity 150ms',
            _open: { opacity: 1 }
        },
        popup: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            display: 'flex',
            flexDirection: 'column',
            width: '400px',
            maxWidth: 'calc(100vw - token(spacing.64))',
            maxHeight: 'calc(100vh - token(spacing.64))',
            overflow: 'hidden',
            borderRadius: 'lg',
            backgroundColor: 'background.primary',
            transform: 'translate(-50%, -50%) scale(0.96)',
            opacity: 0,
            transition: 'opacity 150ms, transform 150ms',
            _open: {
                opacity: 1,
                transform: 'translate(-50%, -50%) scale(1)'
            }
        },
        header: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            height: '64px',
            paddingInline: '12'
        },
        headerTitle: {
            position: 'absolute',
            insetInline: '0',
            textStyle: 'titleS',
            textAlign: 'center',
            pointerEvents: 'none'
        },
        content: {
            display: 'flex',
            flexDirection: 'column',
            gap: '4',
            overflowY: 'auto',
            paddingInline: '32',
            paddingBlock: '16',
            paddingTop: '64px'
        },
        title: {
            textStyle: 'titleM',
            color: 'text.primary',
            textAlign: 'center',
            textWrap: 'balance'
        },
        description: {
            textStyle: 'bodyL',
            color: 'text.secondary',
            textAlign: 'center',
            textWrap: 'balance'
        },
        actions: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8',
            padding: '8'
        }
    },
    variants: {
        hasFloatingClose: {
            false: { content: { paddingTop: '16' } }
        },
        actionsDirection: {
            row: { actions: { flexDirection: 'row' } }
        },
        align: {
            start: {
                headerTitle: {
                    position: 'static',
                    order: 0,
                    flex: '1',
                    paddingLeft: '12',
                    textAlign: 'left',
                    pointerEvents: 'auto'
                },
                headerClose: { order: 1 }
            }
        }
    },
    defaultVariants: {
        hasFloatingClose: true
    }
});
