import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    content: {
        padding: theme.spacing[24],
        paddingBottom: theme.spacing[16],
        backgroundColor: theme.colors.other.constant.white,
        gap: theme.spacing[12],
        borderRadius: theme.radius.xl,
        alignItems: 'center',
        alignSelf: 'center'
    },
    qrCodeContainer: {
        width: 198,
        height: 198,
        position: 'relative'
    },
    address: {
        width: 198,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500'
    },
    badgeContainer: {
        alignItems: 'center',
        marginTop: -4
    }
}));
