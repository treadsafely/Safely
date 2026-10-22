import { css } from '@safely/web-ui/styled-system/css';

export const listStyles = css({
    display: 'flex',
    flexDirection: 'column',
    width: '100%'
});

export const groupStyles = css({
    paddingInline: '8',
    paddingBottom: '8'
});

export const sentinelStyles = css({
    flexShrink: 0,
    height: '1px'
});

export const loaderStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingBottom: '16',
    color: 'icon.tertiary'
});
