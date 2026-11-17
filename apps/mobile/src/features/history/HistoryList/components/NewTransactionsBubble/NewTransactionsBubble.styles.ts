import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(theme => ({
    container: ({ top }: { top: number }) => ({
        position: 'absolute',
        alignItems: 'center',
        top,
        left: 0,
        right: 0,
        padding: theme.spacing[8]
    })
}));

export const ANIMATION_START_Y = -12;
export const SHOW_DURATION = 220;
export const HIDE_DURATION = 160;
export const SHOW_TRANSLATE_DURATION = 240;
export const HIDE_TRANSLATE_DURATION = 180;
