import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    cell: {
        alignItems: 'flex-start'
    },
    image: {
        marginTop: 6
    },
    titleRow: {
        alignItems: 'center',
        minHeight: 24
    },
    title: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[4]
    },
    subtitleRow: {
        alignItems: 'flex-start'
    },
    subvalue: {
        flexShrink: 0
    },
    subtitleContainer: {
        flex: 1,
        flexDirection: 'row'
    },
    chevron: {
        marginTop: 5
    }
}));
