import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({ width: '480px' });

export const headerStyles = css({
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    height: '64px',
    paddingInline: '24'
});

export const titleStyles = css({ textStyle: 'titleS', textAlign: 'left' });

export const bannerStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '16',
    marginInline: '8',
    padding: '16',
    borderRadius: 'sm',
    backgroundColor: 'accent.red/12'
});

export const bannerTextStyles = css({ flex: '1', whiteSpace: 'pre-line' });

export const listStyles = css({ padding: '8' });

export const indexStyles = css({
    flexShrink: 0,
    width: '24px',
    color: 'text.tertiary'
});
