/**
 * Must stay dependency-free: consumed by the unistyles config (mobile) and by the Panda
 * config (web) under plain node. Numbers are unitless — the consumer adds `px` or not.
 */
export const commonTheme = {
    border: {
        hairline: 0.5,
        hairlineAlternate: 0.75,
        border: 1,
        illustrationLine: 2
    },
    radius: {
        xss: 4,
        xs: 6,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        frame: 40,
        full: 1000
    },
    spacing: {
        0: 0,
        2: 2,
        4: 4,
        6: 6,
        8: 8,
        12: 12,
        16: 16,
        24: 24,
        32: 32,
        48: 48,
        64: 64
    },
    typography: {
        displayL: { fontSize: 44, lineHeight: 56, fontWeight: '600', letterSpacing: 0 },
        titleL: { fontSize: 32, lineHeight: 40, fontWeight: '600', letterSpacing: 0 },
        titleM: { fontSize: 24, lineHeight: 32, fontWeight: '600', letterSpacing: 0 },
        titleS: { fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: 0 },
        labelL: { fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: -0.44 },
        labelM: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: -0.15 },
        labelS: { fontSize: 11, lineHeight: 16, fontWeight: '600', letterSpacing: 0 },
        bodyL: { fontSize: 17, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
        bodyLMono: { fontSize: 17, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
        bodyM: { fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0 },
        bodyS: { fontSize: 11, lineHeight: 16, fontWeight: '400', letterSpacing: 0 }
    } as const
};
