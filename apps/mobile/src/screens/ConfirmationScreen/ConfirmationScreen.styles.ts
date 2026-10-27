import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    container: {
        flex: 1,
        paddingTop: theme.spacing[16]
    },
    title: {
        paddingVertical: theme.spacing[16],
        paddingHorizontal: theme.spacing[32]
    },
    assetLogoContainer: {
        padding: theme.spacing[12],
        alignItems: 'center',
        justifyContent: 'center'
    },
    titleWithLogoContainer: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    list: {
        gap: theme.spacing[2],
        paddingHorizontal: theme.spacing[8],
        paddingTop: theme.spacing[8]
    },
    listGroup: {
        marginBottom: 0
    }
}));
