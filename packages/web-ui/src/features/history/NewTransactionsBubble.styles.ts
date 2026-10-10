import { css } from '@safely/web-ui/styled-system/css';

export const containerStyles = css({
    position: 'absolute',
    top: '100%',
    insetInline: '0',
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '8',
    pointerEvents: 'none',
    opacity: 0,
    transform: 'translateY(-12px)',
    transition: 'opacity 160ms ease-in, transform 180ms ease-in',
    '&[data-visible]': {
        pointerEvents: 'auto',
        opacity: 1,
        transform: 'translateY(0)',
        transition: 'opacity 220ms ease-out, transform 240ms ease-out'
    }
});

export const bubbleStyles = css({ cursor: 'pointer' });
