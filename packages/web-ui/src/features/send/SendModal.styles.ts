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
    gap: '2'
});

export const titleStyles = css({ textStyle: 'titleS' });

export const subtitleStyles = css({ display: 'flex', alignItems: 'center', gap: '6' });

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    overflowY: 'auto'
});
