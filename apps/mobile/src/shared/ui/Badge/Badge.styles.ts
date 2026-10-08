import Color from 'color';
import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    container: {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: 1,
        borderRadius: theme.radius.xss,
        variants: {
            type: {
                neutral: {
                    backgroundColor: theme.colors.background.tertiary
                },
                warning: {
                    backgroundColor: Color(theme.colors.accent.orange).alpha(0.16).toString()
                },
                success: {
                    backgroundColor: Color(theme.colors.accent.green).alpha(0.16).toString()
                },
                error: {
                    backgroundColor: Color(theme.colors.accent.red).alpha(0.16).toString()
                },
                warningFilled: {
                    backgroundColor: theme.colors.accent.orange
                },
                translucent: {
                    backgroundColor: Color(theme.colors.other.constant.white).alpha(0.16).toString()
                }
            }
        }
    },
    text: {
        variants: {
            type: {
                neutral: {
                    color: theme.colors.text.secondary
                },
                warning: {
                    color: theme.colors.accent.orange
                },
                success: {
                    color: theme.colors.accent.green
                },
                error: {
                    color: theme.colors.accent.red
                },
                warningFilled: {
                    color: theme.colors.other.constant.black
                },
                translucent: {
                    color: theme.colors.other.constant.white
                }
            }
        }
    }
}));
