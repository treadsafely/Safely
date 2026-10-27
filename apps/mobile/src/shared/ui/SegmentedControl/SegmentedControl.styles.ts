import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    container: {
        flexDirection: 'row',
        gap: theme.spacing[2],
        padding: theme.spacing[2],
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.background.secondary
    },
    segment: (isSelected: boolean) => ({
        paddingHorizontal: theme.spacing[16],
        paddingVertical: theme.spacing[6],
        borderRadius: theme.radius.full,
        backgroundColor: isSelected
            ? theme.colors.button.tertiary.background
            : theme.colors.button.secondary.background
    })
}));
