import { css } from '@safely/web-ui/styled-system/css';

/* the full-height sheet of the scanner flow, so the two modals do not resize into each other */
export const popupStyles = css({
    width: '480px',
    height: 'calc(100vh - token(spacing.64))',
    justifyContent: 'center'
});

export const contentStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%'
});

export const iconStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '16',
    paddingInline: '32'
});

export const textStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
    width: '100%',
    maxWidth: '400px',
    paddingInline: '32',
    paddingBlock: '16'
});

export const actionsStyles = css({
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '400px',
    paddingBottom: '16'
});
