import { css } from '@safely/web-ui/styled-system/css';

export const emojiStyles = {
    xsmall: css({ fontSize: '12px', lineHeight: '16px' }),
    small: css({ fontSize: '16px', lineHeight: '20px' }),
    medium: css({ fontSize: '20px', lineHeight: '24px' }),
    large: css({ fontSize: '56px', lineHeight: '64px' })
};

const colorBase = {
    display: 'block',
    borderRadius: 'full',
    backgroundColor: 'var(--wallet-color)'
} as const;

export const colorStyles = {
    xsmall: css({ ...colorBase, width: '12px', height: '12px' }),
    small: css({ ...colorBase, width: '16px', height: '16px' }),
    medium: css({ ...colorBase, width: '20px', height: '20px' }),
    large: css({ ...colorBase, width: '56px', height: '56px' })
};
