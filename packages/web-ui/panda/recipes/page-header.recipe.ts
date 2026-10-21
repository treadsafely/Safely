import { defineSlotRecipe } from '@pandacss/dev';

export const pageHeaderRecipe = defineSlotRecipe({
    className: 'pageHeader',
    description: 'Title strip at the top of a column',
    slots: ['root', 'leading', 'titles', 'title', 'subtitle', 'actions'],
    base: {
        root: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            gap: '8',
            height: '64px',
            paddingInline: '24',
            appRegion: 'drag'
        },
        leading: {
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            appRegion: 'no-drag'
        },
        titles: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: '1',
            minWidth: '0'
        },
        title: {
            textStyle: 'titleS',
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
        },
        subtitle: {
            textStyle: 'bodyM',
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
        },
        actions: {
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            gap: '8',
            appRegion: 'no-drag'
        }
    },
    variants: {
        hasDivider: {
            true: {
                root: {
                    borderBottomWidth: 'hairline',
                    borderBottomStyle: 'solid',
                    borderBottomColor: 'other.transparentElement'
                }
            }
        },
        isCentered: {
            true: {
                root: {
                    paddingInline: '12'
                },
                /* clears the leading slot on both sides so the title stays centred in the column */
                titles: {
                    position: 'absolute',
                    insetInline: '64px',
                    insetBlock: '0',
                    alignItems: 'center',
                    pointerEvents: 'none'
                },
                title: { textAlign: 'center' },
                subtitle: { textAlign: 'center' }
            }
        }
    }
});
