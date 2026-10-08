import { css } from '@safely/web-ui/styled-system/css';

export const rootStyles = css({
    position: 'relative',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'background.primary'
});

export const backdropStyles = css({
    position: 'absolute',
    inset: '0',
    backgroundImage: 'var(--welcome-backdrop)',
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat'
});

export const footerStyles = css({
    position: 'absolute',
    bottom: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '480px'
});

export const logoStyles = css({
    display: 'flex',
    alignItems: 'center',
    padding: '8'
});

export const headingStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
    width: '100%',
    paddingInline: '32',
    paddingBlock: '16'
});

export const subtitleStyles = css({
    opacity: 0.64,
    textWrap: 'balance'
});

export const actionsStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32',
    width: '100%',
    paddingInline: '64',
    paddingTop: '24',
    paddingBottom: '32'
});

export const primaryActionsStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '8',
    width: '100%'
});

export const legalStyles = css({
    /* the shared string breaks the line with \n, the only form mobile's Trans also honours */
    whiteSpace: 'pre-line',
    width: '100%',
    paddingInline: '16',
    paddingBottom: '32'
});

export const legalLinkStyles = css({
    color: 'text.secondary',
    backgroundColor: 'transparent',
    borderWidth: '0',
    padding: '0',
    font: 'inherit',
    cursor: 'pointer'
});
