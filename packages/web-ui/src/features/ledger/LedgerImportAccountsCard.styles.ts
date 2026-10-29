import { css } from '@safely/web-ui/styled-system/css';

export const columnStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    width: '100%'
});

export const scrollStyles = css({
    flex: '1',
    minHeight: '0',
    overflowY: 'auto'
});

export const captionStyles = css({
    display: 'block',
    paddingTop: '8',
    paddingInline: '32'
});

export const linkStyles = css({
    cursor: 'pointer',
    _hover: { color: 'text.primary' }
});
