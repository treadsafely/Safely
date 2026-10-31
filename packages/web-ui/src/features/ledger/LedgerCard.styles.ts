import { css } from '@safely/web-ui/styled-system/css';

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%'
});

export const centeredBodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '1',
    width: '100%',
    gap: '16'
});

export const imageStyles = css({
    display: 'block',
    width: '100%',
    maxWidth: '390px',
    height: 'auto'
});

export const stepsStyles = css({
    width: '100%',
    paddingBlock: '16'
});

export const submitStyles = css({
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0,
    paddingBlock: '24'
});

export const pulseStyles = css({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '96px',
    height: '96px'
});

export const ringStyles = css({
    position: 'absolute',
    inset: '0',
    borderRadius: 'full',
    backgroundColor: 'accent.blue',
    animation: 'ring 1.6s ease-out infinite',
    '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
        opacity: '0.16'
    }
});
