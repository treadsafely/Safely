import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({
    width: '480px',
    /* 636 by default; a short window squeezes it down to 480, long content grows it up to 768 */
    minHeight: 'clamp(480px, calc(100vh - token(spacing.64)), 636px)',
    maxHeight: 'min(768px, calc(100vh - token(spacing.64)))'
});

export const headingStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: '1',
    minWidth: '0',
    paddingInline: '8',
    gap: '2'
});

export const titleStyles = css({ textStyle: 'titleS' });

export const subtitleStyles = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    minWidth: '0',
    gap: '6'
});

export const fixedStyles = css({ flexShrink: 0, whiteSpace: 'nowrap' });

export const shrinkableStyles = css({ flexShrink: 1, minWidth: '0' });

export const shrinkableHalfStyles = css({ flexShrink: 1, minWidth: '0', maxWidth: '30%' });

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    overflowY: 'auto'
});
