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
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
});

export const columnStyles = css({
    display: 'flex',
    flexDirection: 'column',
    marginTop: 'auto',
    width: '100%'
});

export const logoStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '64',
    paddingBottom: '8'
});

export const headingStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
    width: '100%',
    paddingInline: '32',
    paddingBlock: '16'
});

export const subtitleStyles = css({ opacity: 0.64 });

export const actionsStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24',
    width: '100%',
    paddingInline: '64',
    paddingTop: '24',
    paddingBottom: '32'
});

export const actionsColumnStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '24',
    width: '100%',
    paddingInline: '32'
});

export const primaryActionsStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '8',
    width: '100%'
});

export const linkWithQrStyles = css({ paddingInline: '24' });

export const legalStyles = css({
    /* the shared string carries mobile's line break, and the card is wide enough to ignore it */
    whiteSpace: 'normal',
    width: '100%',
    paddingInline: '16',
    paddingBottom: '32'
});

export const legalLinkStyles = css({
    color: 'text.secondary',
    backgroundColor: 'transparent',
    borderWidth: '0',
    padding: '0',
    cursor: 'pointer',
    _hover: { color: 'text.primary' }
});
