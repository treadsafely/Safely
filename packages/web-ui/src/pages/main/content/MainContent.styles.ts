import { css } from '@safely/web-ui/styled-system/css';

export const headerStyles = css({
    position: 'sticky',
    top: '0',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8',
    flexShrink: 0,
    paddingInline: '24',
    paddingBottom: '16',
    backgroundColor: 'background.primary'
});
