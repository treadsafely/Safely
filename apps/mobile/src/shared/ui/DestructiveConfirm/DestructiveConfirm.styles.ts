import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    content: {
        alignItems: 'center',
        paddingHorizontal: theme.spacing[24]
    },
    titleBox: {
        alignItems: 'center',
        gap: theme.spacing[4],
        marginVertical: theme.spacing[16],
        marginHorizontal: theme.spacing[8]
    },
    footer: {
        width: '100%',
        gap: theme.spacing[8],
        marginVertical: theme.spacing[24]
    }
}));
