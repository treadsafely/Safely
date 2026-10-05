import Color from 'color';
import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    captureScreen: {
        flex: 1
    },
    content: {
        paddingHorizontal: theme.spacing[8],
        gap: theme.spacing[8]
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing[16],
        borderRadius: theme.radius.md,
        paddingVertical: theme.spacing[12],
        paddingHorizontal: theme.spacing[16],
        backgroundColor: Color(theme.colors.accent.red).alpha(0.16).toString()
    },
    bannerText: {
        flex: 1,
        color: theme.colors.accent.red
    },
    bannerIcon: {
        tintColor: theme.colors.accent.red
    },
    wordsContainer: {
        flexDirection: 'row',
        borderRadius: theme.radius.md,
        borderWidth: theme.border.hairline,
        borderColor: theme.colors.other.transparentElement,
        backgroundColor: theme.colors.background.secondary,
        overflow: 'hidden'
    },
    column: {
        flex: 1
    }
}));
