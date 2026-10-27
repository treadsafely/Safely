import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create(() => ({
    canvas: ({ position, height }: { position: 'top' | 'bottom'; height: number }) => ({
        position: 'absolute',
        left: 0,
        right: 0,
        height,
        ...(position === 'top' ? { top: 0 } : { bottom: 0 })
    })
}));
