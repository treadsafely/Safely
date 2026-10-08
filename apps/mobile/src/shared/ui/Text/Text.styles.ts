import { Platform } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { commonTheme } from '@safely/ux/theme';

type TypographyVariant =
    (typeof commonTheme)['typography'][keyof (typeof commonTheme)['typography']];

const nativeText = (variant: TypographyVariant) => ({
    fontSize: variant.fontSize,
    lineHeight: variant.lineHeight,
    fontWeight: variant.fontWeight
});

export const styles = StyleSheet.create(theme => ({
    text: {
        includeFontPadding: false,
        color: theme.colors.text.primary,
        textAlignVertical: 'center',
        variants: {
            color: {
                primary: {
                    color: theme.colors.text.primary
                },
                secondary: {
                    color: theme.colors.text.secondary
                },
                tertiary: {
                    color: theme.colors.text.tertiary
                },
                link: {
                    color: theme.colors.text.link
                },
                accentRed: {
                    color: theme.colors.accent.red
                },
                accentGreen: {
                    color: theme.colors.accent.green
                },
                accentOrange: {
                    color: theme.colors.accent.orange
                },
                constantBlack: {
                    color: theme.colors.other.constant.black
                },
                constantWhite: {
                    color: theme.colors.other.constant.white
                }
            },
            variant: {
                displayL: nativeText(theme.typography.displayL),
                titleL: nativeText(theme.typography.titleL),
                titleM: nativeText(theme.typography.titleM),
                titleS: nativeText(theme.typography.titleS),
                labelL: nativeText(theme.typography.labelL),
                labelM: nativeText(theme.typography.labelM),
                labelS: nativeText(theme.typography.labelS),
                bodyL: nativeText(theme.typography.bodyL),
                bodyLMono: {
                    ...nativeText(theme.typography.bodyLMono),
                    fontFamily: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace'
                },
                bodyM: nativeText(theme.typography.bodyM),
                bodyS: nativeText(theme.typography.bodyS)
            },
            textAlign: {
                center: {
                    textAlign: 'center'
                },
                left: {
                    textAlign: 'left'
                },
                right: {
                    textAlign: 'right'
                }
            },
            textTransform: {
                uppercase: {
                    textTransform: 'uppercase'
                },
                lowercase: {
                    textTransform: 'lowercase'
                },
                capitalize: {
                    textTransform: 'capitalize'
                }
            },
            monospace: {
                true: {
                    fontVariant: ['tabular-nums', 'lining-nums']
                }
            }
        }
    },
    skeletonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        variants: {
            // TODO: boring, maybe it's better to split complex styles with tons of variants into separate Stylesheet.create
            monospace: {},
            textTransform: {},
            textAlign: {},
            color: {},
            variant: {
                displayL: {
                    height: 56
                },
                labelL: {
                    height: 24
                },
                bodyM: {
                    height: 20
                }
            }
        }
    }
}));

export const SKELETON_CONFIG = {
    displayL: {
        height: 32,
        width: 96
    },
    labelL: {
        height: 16,
        width: 64
    },
    bodyM: {
        height: 14,
        width: 48
    }
};
