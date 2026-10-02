import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme, rt) => ({
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    textContainer: {
        paddingVertical: theme.spacing[16],
        paddingHorizontal: theme.spacing[32],
        gap: theme.spacing[4],
        alignItems: 'center'
    },
    buttonContainer: {
        margin: theme.spacing[24],
        marginBottom: rt.insets.bottom + theme.spacing[24]
    },
    iconContainer: {
        paddingTop: theme.spacing[16]
    }
}));
