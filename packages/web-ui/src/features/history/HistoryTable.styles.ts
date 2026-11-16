import { css } from '@safely/web-ui/styled-system/css';

export const tableStyles = css({
    width: '100%',
    paddingBottom: '8'
});

export const sentinelStyles = css({
    gridColumn: '1 / -1',
    height: '1px'
});

export const loaderStyles = css({
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'center',
    paddingBlock: '16',
    color: 'icon.tertiary'
});
