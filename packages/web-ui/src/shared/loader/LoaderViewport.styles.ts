import { css } from '@safely/web-ui/styled-system/css';

export const overlayStyles = css({
    position: 'fixed',
    inset: '0',
    zIndex: 'loader',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'background.overlay',
    backdropFilter: 'blur(8px)'
});
