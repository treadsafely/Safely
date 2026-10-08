import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    container: {
        padding: theme.spacing[12],
        variants: {
            type: {
                transparent: {
                    padding: theme.spacing[16]
                }
            }
        }
    },
    button: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.button.secondary.background,
        borderRadius: theme.radius.full,
        padding: theme.spacing[12],
        variants: {
            type: {
                rounded: {
                    borderRadius: theme.radius.full
                },
                transparent: {
                    backgroundColor: 'transparent',
                    paddingVertical: theme.spacing[6],
                    paddingHorizontal: theme.spacing[8],
                    borderColor: theme.colors.other.transparentElement,
                    borderRadius: theme.radius.xs,
                    borderWidth: theme.border.hairline
                },
                translucent: {
                    backgroundColor: theme.colors.button.transparent.background
                },
                small: {
                    paddingVertical: 10,
                    paddingHorizontal: theme.spacing[16],
                    borderRadius: theme.radius.full
                }
            }
        }
    }
}));
