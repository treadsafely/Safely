import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    image: {
        borderRadius: theme.radius.full,
        variants: {
            size: {
                medium: {
                    width: 32,
                    height: 32
                },
                large: {
                    width: 48,
                    height: 48
                },
                xlarge: {
                    width: 72,
                    height: 72
                }
            }
        }
    }
}));
