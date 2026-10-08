import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({
    width: '480px',
    height: '636px',
    maxHeight: 'calc(100vh - token(spacing.32))'
});

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    paddingInline: '24'
});

export const fieldStyles = css({
    padding: '0',
    '& textarea': { minHeight: '96px' }
});

export const errorStyles = css({ paddingInline: '16', paddingTop: '8' });
