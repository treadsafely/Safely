import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    container: {
        marginTop: theme.spacing[8]
    },
    field: {
        maxHeight: 120
    },
    error: {
        color: theme.colors.accent.red
    }
}));
