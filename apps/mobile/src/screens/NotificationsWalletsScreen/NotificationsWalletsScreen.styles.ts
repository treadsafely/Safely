import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme, rt) => ({
    container: {
        paddingHorizontal: theme.spacing[8]
    },
    listContent: {
        flexGrow: 1,
        paddingBottom: theme.spacing[8] + rt.insets.bottom
    },
    headerPlaceholder: {
        width: 40,
        padding: theme.spacing[12]
    },
    walletsGroup: {
        marginTop: theme.spacing[2]
    },
    checkmarkSlot: {
        width: 28,
        height: 28
    }
}));
