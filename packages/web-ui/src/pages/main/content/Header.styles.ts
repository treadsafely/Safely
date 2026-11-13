import { css } from '@safely/web-ui/styled-system/css';

export const rowStyles = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    height: '52px',
    gap: '8',
    appRegion: 'drag'
});

export const titleStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '8'
});

export const addressStyles = css({
    cursor: 'pointer',
    appRegion: 'no-drag',
    transition: 'color 150ms',
    _hover: { color: 'text.primary' }
});
