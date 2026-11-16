import { css } from '@safely/web-ui/styled-system/css';

export const headerStyles = css({
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8',
    flexShrink: 0,
    paddingInline: '16',
    paddingBottom: '16',
    borderBottomWidth: 'hairline',
    borderBottomStyle: 'solid',
    borderBottomColor: 'other.transparentElement',
    backgroundColor: 'background.primary'
});

export const scrollStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    overflowY: 'auto',
    scrollbarGutter: 'stable both-edges'
});

export const chartStyles = css({
    borderBottomWidth: 'hairline',
    borderBottomStyle: 'solid',
    borderBottomColor: 'other.transparentElement'
});
