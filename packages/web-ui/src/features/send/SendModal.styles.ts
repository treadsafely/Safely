import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({
    width: '480px',
    height: '636px',
    maxHeight: 'calc(100vh - token(spacing.32))'
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
