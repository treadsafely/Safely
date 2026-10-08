import { defineSlotRecipe } from '@pandacss/dev';

export const listRecipe = defineSlotRecipe({
    className: 'list',
    description: 'Group of cells with an optional title and footer',
    slots: ['root', 'title', 'group', 'footer'],
    base: {
        root: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%'
        },
        group: {
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 'sm',
            overflow: 'hidden'
        },
        footer: {
            paddingInline: '8',
            paddingTop: '8',
            textStyle: 'bodyM',
            color: 'text.tertiary'
        }
    },
    variants: {
        titleVariant: {
            caption: {
                title: {
                    paddingInline: '8',
                    paddingTop: '16',
                    paddingBottom: '8',
                    textStyle: 'bodyM',
                    textTransform: 'uppercase',
                    color: 'text.tertiary'
                }
            },
            heading: {
                title: {
                    paddingInline: '16',
                    paddingTop: '16',
                    paddingBottom: '12',
                    textStyle: 'labelM',
                    textTransform: 'capitalize',
                    color: 'text.primary'
                }
            }
        },
        variant: {
            divided: {
                group: {
                    '& > * + *': {
                        borderTopWidth: 'hairline',
                        borderTopStyle: 'solid',
                        borderTopColor: 'other.transparentElement'
                    }
                }
            },
            separated: {
                group: {
                    gap: '2',
                    overflow: 'visible',
                    '& > *': {
                        borderRadius: 'sm',
                        overflow: 'hidden'
                    }
                }
            }
        }
    },
    defaultVariants: {
        titleVariant: 'caption',
        variant: 'divided'
    }
});
