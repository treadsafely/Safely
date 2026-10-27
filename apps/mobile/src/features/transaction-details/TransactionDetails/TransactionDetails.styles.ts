import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    headerContainer: {
        paddingHorizontal: theme.spacing[32],
        paddingVertical: theme.spacing[64],
        gap: theme.spacing[16]
    },
    amountContainer: {
        gap: theme.spacing[4]
    },
    list: {
        gap: theme.spacing[2],
        padding: theme.spacing[8]
    },
    iconsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[16]
    },
    assetImageContainer: {
        padding: theme.spacing[12],
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center'
    },
    assetBadge: {
        position: 'absolute',
        bottom: theme.spacing[4],
        right: theme.spacing[4],
        padding: theme.spacing[6],
        borderRadius: theme.radius.full,
        borderWidth: theme.border.illustrationLine,
        borderColor: theme.colors.background.primary,
        backgroundColor: theme.colors.background.tertiary,
        alignItems: 'center',
        justifyContent: 'center'
    }
}));
