import { css } from '@safely/web-ui/styled-system/css';

export const rootStyles = css({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    margin: '0',
    paddingBlock: '8',
    paddingInline: '16',
    listStyle: 'none',
    backgroundColor: 'background.secondary',
    borderRadius: 'md'
});

export const rowStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '8',
    paddingBlock: '4'
});

export const indicatorStyles = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '20px',
    height: '20px',
    color: 'icon.secondary'
});

export const dotStyles = css({
    width: '6px',
    height: '6px',
    borderRadius: 'full',
    backgroundColor: 'icon.tertiary'
});
