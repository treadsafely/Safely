import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme, rt) => ({
    iconBox: {
        alignItems: 'center',
        paddingTop: theme.spacing[16],
        paddingHorizontal: theme.spacing[32]
    },
    titleBox: {
        gap: theme.spacing[4],
        paddingVertical: theme.spacing[16],
        paddingHorizontal: theme.spacing[32]
    },
    table: {
        paddingHorizontal: theme.spacing[24],
        paddingVertical: theme.spacing[16]
    },
    cell: {
        paddingHorizontal: 0,
        gap: 0
    },
    column: {
        paddingHorizontal: theme.spacing[16]
    },
    description: {
        paddingHorizontal: theme.spacing[24],
        paddingBottom: theme.spacing[24]
    },
    footer: {
        gap: theme.spacing[8],
        paddingHorizontal: theme.spacing[24],
        paddingTop: theme.spacing[24],
        paddingBottom: theme.spacing[24] + rt.insets.bottom
    },
    buttons: {
        flexDirection: 'row',
        gap: theme.spacing[8]
    },
    button: {
        flex: 1
    },
    trustedSite: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing[8],
        paddingVertical: theme.spacing[16]
    }
}));
