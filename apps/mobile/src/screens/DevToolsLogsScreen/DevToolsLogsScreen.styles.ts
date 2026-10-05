import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme, rt) => ({
    captureScreen: {
        flex: 1
    },
    content: {
        flex: 1,
        paddingHorizontal: theme.spacing[16],
        paddingTop: theme.spacing[12],
        gap: theme.spacing[12]
    },
    list: {
        flex: 1
    },
    listContent: {
        gap: theme.spacing[8],
        paddingVertical: theme.spacing[8]
    },
    empty: {
        paddingVertical: theme.spacing[32],
        alignItems: 'center'
    },
    footer: {
        flexDirection: 'row',
        gap: theme.spacing[8],
        paddingVertical: theme.spacing[12],
        marginBottom: rt.insets.bottom
    },
    footerButton: {
        flex: 1
    }
}));
