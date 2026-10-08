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
