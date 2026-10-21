import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({ width: '400px' });

export const confirmStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '16',
    marginInline: '8',
    padding: '16',
    borderRadius: 'sm',
    backgroundColor: 'background.tertiary',
    cursor: 'pointer'
});

export const confirmTextStyles = css({ flex: '1' });

export const linkStyles = css({
    color: 'text.link',
    backgroundColor: 'transparent',
    borderWidth: '0',
    padding: '0',
    font: 'inherit',
    cursor: 'pointer'
});
