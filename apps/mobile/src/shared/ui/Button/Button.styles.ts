import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        variants: {
            disabled: {
                true: {
                    opacity: 0.64
                }
            },
            size: {
                small: {
                    paddingHorizontal: theme.spacing[16],
                    paddingVertical: theme.spacing[8],
                    borderRadius: theme.radius.full,
                    gap: theme.spacing[8]
                },
                medium: {
                    paddingHorizontal: theme.spacing[24],
                    paddingVertical: theme.spacing[12],
                    borderRadius: theme.radius.full,
                    gap: theme.spacing[8]
                },
                large: {
                    paddingHorizontal: theme.spacing[24],
                    paddingVertical: theme.spacing[16],
                    borderRadius: theme.radius.full,
                    gap: theme.spacing[8]
                }
            },
            type: {
                primary: {
                    backgroundColor: theme.colors.button.primary.background
                },
                secondary: {
                    backgroundColor: theme.colors.button.secondary.background
                },
                tertiary: {
                    backgroundColor: theme.colors.button.tertiary.background
                },
                destructive: {
                    backgroundColor: theme.colors.button.destructive.background
                },
                warning: {
                    backgroundColor: theme.colors.button.destructiveOrange.background
                },
                overlay: {
                    backgroundColor: theme.colors.other.constant.white
                },
                blue: {
                    backgroundColor: 'rgba(1, 120, 255, 0.08)',
                    borderColor: 'rgba(1, 120, 255, 0.2)',
                    borderWidth: 0.75
                }
            }
        }
    },
    text: {
        variants: {
            disabled: {
                true: {}
            },
            size: {
                small: {},
                medium: {},
                large: {}
            },
            type: {
                primary: {
                    color: theme.colors.button.primary.foreground
                },
                secondary: {
                    color: theme.colors.button.secondary.foreground
                },
                tertiary: {
                    color: theme.colors.button.tertiary.foreground
                },
                destructive: {
                    color: theme.colors.accent.red
                },
                warning: {
                    color: theme.colors.accent.orange
                },
                overlay: {
                    color: theme.colors.other.constant.black
                },
                blue: {
                    color: theme.colors.text.link
                }
            }
        }
    }
}));
