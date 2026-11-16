import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    header: {
        backgroundColor: 'transparent'
    },
    backdrop: {
        flex: 1,
        backgroundColor: theme.colors.background.primary
    },
    hairline: {
        ...StyleSheet.absoluteFillObject,
        borderBottomWidth: theme.border.hairline,
        borderBottomColor: theme.colors.other.transparentElement
    },
    title: {
        alignItems: 'center',
        maxWidth: 220
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[6]
    },
    address: {
        opacity: 0.64,
        maxWidth: 160
    }
}));
