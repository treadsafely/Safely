import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({
    width: '480px',
    maxHeight: 'calc(100vh - token(spacing.32))'
});

export const iconStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '32'
});

export const optionsStyles = css({ padding: '8' });
