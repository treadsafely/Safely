import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    container: ({ screenHeaderHeight }: { screenHeaderHeight: number }) => ({
        paddingTop: screenHeaderHeight
    }),
    gradient: ({ overscrollExtent }: { overscrollExtent: number }) => ({
        position: 'absolute',
        top: -overscrollExtent,
        left: 0,
        right: 0
    }),
    content: {
        borderBottomWidth: theme.border.hairline,
        borderBottomColor: theme.colors.other.transparentElement
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
    }
}));
