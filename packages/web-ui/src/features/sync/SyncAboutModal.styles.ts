import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({
    display: 'grid',
    gridTemplateColumns: '400px 400px',
    width: '864px',
    padding: '32'
});

export const coverStyles = css({
    display: 'block',
    width: '400px',
    height: '400px',
    borderRadius: 'md'
});

export const panelStyles = css({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '400px',
    padding: '32'
});

export const textsStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '16'
});

export const footerStyles = css({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8'
});

export const linkStyles = css({
    color: 'text.link',
    backgroundColor: 'transparent',
    borderWidth: '0',
    padding: '0',
    font: 'inherit',
    cursor: 'pointer'
});
