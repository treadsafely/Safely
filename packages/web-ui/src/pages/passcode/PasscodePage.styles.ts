import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({
    width: '480px',
    height: '636px',
    maxHeight: 'calc(100vh - token(spacing.32))'
});

export const descriptionStyles = css({ whiteSpace: 'pre-line' });

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0'
});

export const keypadFillStyles = css({
    flex: '1',
    justifyContent: 'space-between'
});
