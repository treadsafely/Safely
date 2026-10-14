import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({
    width: '480px',
    height: '636px',
    maxHeight: 'calc(100vh - token(spacing.32))'
});

export const contentStyles = css({
    flex: '1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16'
});

export const textStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '4'
});

export const compactIconStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingBlock: '8'
});

export const compactActionStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingBlock: '16'
});

export const skipStyles = css({ marginLeft: 'auto' });
