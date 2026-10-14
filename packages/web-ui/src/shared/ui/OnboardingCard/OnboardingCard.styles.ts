import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({ width: '600px', height: '600px' });

export const shadowStyles = css({ boxShadow: '0 16px 32px 0 rgba(0, 0, 0, 0.16)' });

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    flex: '1',
    minHeight: '0',
    paddingInline: '60px',
    overflowY: 'auto'
});
