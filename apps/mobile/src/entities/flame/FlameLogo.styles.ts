import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        variants: {
            background: {
                brand: {
                    backgroundColor: theme.colors.brand.flame
                },
                black: {
                    backgroundColor: theme.colors.other.constant.black
                }
            },
            size: {
                medium: {
                    width: 32,
                    height: 32
                },
                large: {
                    width: 48,
                    height: 48
                }
            }
        }
    }
}));
