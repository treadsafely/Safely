import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme, rt) => ({
    iconBox: {
        alignItems: 'center',
        paddingTop: theme.spacing[16],
        paddingHorizontal: theme.spacing[32]
    },
    titleBox: {
        alignItems: 'center',
        gap: theme.spacing[4],
        paddingVertical: theme.spacing[16],
        paddingHorizontal: theme.spacing[32]
    },
    table: {
        paddingHorizontal: theme.spacing[32],
        paddingVertical: theme.spacing[16]
    },
    accountId: {
        alignItems: 'center',
        paddingHorizontal: theme.spacing[16],
        paddingBottom: theme.spacing[24]
    },
    footer: {
        padding: theme.spacing[24],
        paddingBottom: theme.spacing[24] + rt.insets.bottom
    }
}));
