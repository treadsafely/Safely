import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    content: {
        paddingHorizontal: theme.spacing[24]
    },
    titleBox: {
        alignItems: 'center',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[16],
        marginHorizontal: theme.spacing[8]
    },
    addressBox: {
        gap: theme.spacing[4],
        padding: theme.spacing[16],
        marginBottom: theme.spacing[16],
        borderRadius: theme.radius.md,
        borderWidth: theme.border.hairline,
        borderColor: theme.colors.other.transparentElement,
        backgroundColor: theme.colors.background.secondary
    },
    footer: {
        gap: theme.spacing[8],
        marginVertical: theme.spacing[24]
    }
}));
