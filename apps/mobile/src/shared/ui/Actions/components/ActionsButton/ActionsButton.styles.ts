import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    container: {
        flex: 1,
        alignItems: 'center',
        gap: theme.spacing[8],
        paddingVertical: theme.spacing[16],
        paddingHorizontal: theme.spacing[4]
    },
    iconContainer: {
        backgroundColor: theme.colors.background.tertiary,
        borderWidth: theme.border.hairline,
        borderColor: theme.colors.other.transparentElement,
        borderRadius: theme.radius.full,
        padding: theme.spacing[12],
        variants: {
            variant: {
                tertiary: {},
                transparent: {
                    backgroundColor: theme.colors.button.transparent.background
                }
            }
        }
    }
}));
