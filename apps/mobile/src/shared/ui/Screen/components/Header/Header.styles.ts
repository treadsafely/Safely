import { StyleSheet } from 'react-native-unistyles';

export const HEADER_HEIGHT = 64;
const Z_INDEX = 1000;

export const styles = StyleSheet.create((theme, rt) => ({
    backdrop: ({ shouldInsetTop }: { shouldInsetTop: boolean }) => ({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: shouldInsetTop ? rt.insets.top + HEADER_HEIGHT : HEADER_HEIGHT,
        zIndex: Z_INDEX
    }),
    container: ({ shouldInsetTop }: { shouldInsetTop: boolean }) => ({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: shouldInsetTop ? rt.insets.top + HEADER_HEIGHT : HEADER_HEIGHT,
        paddingTop: shouldInsetTop ? rt.insets.top : 0,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: Z_INDEX,
        backgroundColor: theme.colors.background.primary,
        variants: {
            background: {
                primary: {
                    backgroundColor: theme.colors.background.primary
                },
                secondary: {
                    backgroundColor: theme.colors.background.secondary
                },
                tertiary: {
                    backgroundColor: theme.colors.background.tertiary
                },
                overlay: {
                    backgroundColor: theme.colors.background.overlay
                },
                transparent: {
                    backgroundColor: 'transparent'
                },
                constantBlack: {
                    backgroundColor: theme.colors.other.constant.black
                }
            }
        }
    }),
    side: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    sideRight: {
        justifyContent: 'flex-end'
    },
    topInset: {
        height: rt.insets.top
    },
    headerHeight: {
        height: HEADER_HEIGHT,
        variants: {
            shortHeader: {
                true: {
                    height: HEADER_HEIGHT - 32
                }
            }
        }
    }
}));
