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
    alignItems: 'flex-start',
    gap: '8',
    paddingBlock: '4'
});

export const numberStyles = css({
    flexShrink: 0,
    width: '20px',
    textAlign: 'right'
});

export const textStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
    minWidth: '0'
});
