import { commonTheme } from './common';

export const darkTheme = {
    ...commonTheme,
    colors: {
        text: {
            primary: 'rgba(237, 237, 237, 1)',
            secondary: 'rgba(160, 160, 166, 1)',
            tertiary: 'rgba(110, 110, 115, 1)',
            link: 'rgba(1, 120, 255, 1)'
        },
        icon: {
            primary: 'rgba(237, 237, 237, 1)',
            secondary: 'rgba(160, 160, 166, 1)',
            tertiary: 'rgba(110, 110, 115, 1)'
        },
        background: {
            primary: 'rgba(12, 12, 13, 1)',
            secondary: 'rgba(26, 26, 29, 1)',
            tertiary: 'rgba(38, 38, 43, 1)',
            overlay: 'rgba(31, 31, 31, 0.48)'
        },
        input: {
            background: 'rgba(26, 26, 29, 1)',
            focused: {
                border: 'rgba(1, 120, 255, 1)'
            },
            error: {
                border: 'rgba(229, 64, 69, 1)'
            }
        },
        button: {
            primary: {
                background: 'rgba(1, 120, 255, 1)',
                foreground: 'rgba(255, 255, 255, 1)'
            },
            secondary: {
                background: 'rgba(26, 26, 29, 1)',
                foreground: 'rgba(237, 237, 237, 1)'
            },
            tertiary: {
                background: 'rgba(38, 38, 43, 1)',
                foreground: 'rgba(255, 255, 255, 1)'
            },
            transparent: {
                background: 'rgba(255, 255, 255, 0.2)',
                foreground: 'rgba(255, 255, 255, 1)'
            }
        },
        accent: {
            accent: 'rgba(1, 120, 255, 1)',
            green: 'rgba(31, 194, 122, 1)',
            red: 'rgba(229, 64, 69, 1)',
            orange: 'rgba(245, 168, 34, 1)',
            blue: 'rgba(1, 120, 255, 1)'
        },
        brand: {
            bitcoin: 'rgba(247, 147, 26, 1)',
            flame: 'rgba(250, 70, 25, 1)'
        },
        wallet: {
            lightGray: 'rgba(110, 110, 115, 1)',
            red: 'rgba(255, 85, 85, 1)',
            orange: 'rgba(255, 179, 71, 1)',
            green: 'rgba(60, 203, 127, 1)',
            blue: 'rgba(1, 120, 255, 1)',
            aquamarine: 'rgba(71, 200, 255, 1)',
            purple: 'rgba(146, 92, 255, 1)',
            magneta: 'rgba(255, 71, 157, 1)'
        },
        other: {
            transparentElement: 'rgba(255, 255, 255, 0.08)',
            hover: 'rgba(255, 255, 255, 0.04)',
            constant: {
                white: 'rgba(255, 255, 255, 1)',
                black: 'rgba(0, 0, 0, 1)'
            }
        }
    }
};
