import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    container: {
        flex: 1
    },
    row: {
        paddingTop: 2,
        paddingHorizontal: theme.spacing[8]
    },
    sectionHeaderContainer: {
        paddingHorizontal: theme.spacing[16],
        paddingTop: theme.spacing[24],
        paddingBottom: 10
    },
    firstSectionHeaderContainer: {
        paddingTop: theme.spacing[16]
    },
    titleContainer: {
        alignItems: 'flex-start'
    }
}));
