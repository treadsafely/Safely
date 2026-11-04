import { css } from '@safely/web-ui/styled-system/css';

export const tableStyles = css({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    paddingBottom: '8'
});

export const sentinelStyles = css({
    flexShrink: 0,
    height: '1px'
});

export const loaderStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingBlock: '16',
    color: 'icon.tertiary'
});
