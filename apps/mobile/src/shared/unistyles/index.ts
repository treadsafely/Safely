import { StyleSheet } from 'react-native-unistyles';

import { darkTheme } from '@safely/ux/theme';

type Themes = {
    dark: typeof darkTheme;
};

declare module 'react-native-unistyles' {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    export interface UnistylesThemes extends Themes {}
}

StyleSheet.configure({
    themes: {
        dark: darkTheme
    },
    settings: {
        initialTheme: 'dark'
    }
});
