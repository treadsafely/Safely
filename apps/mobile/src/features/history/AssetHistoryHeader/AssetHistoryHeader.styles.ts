import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    header: {
        backgroundColor: 'transparent'
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
    },
    balance: {
        alignItems: 'center',
        gap: theme.spacing[4],
        paddingTop: theme.spacing[32],
        paddingBottom: theme.spacing[24],
        paddingHorizontal: theme.spacing[24]
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: theme.spacing[6]
    },
    secondary: {
        opacity: 0.56
    },
    divider: {
        height: theme.border.hairline,
        backgroundColor: theme.colors.other.transparentElement
    }
}));
