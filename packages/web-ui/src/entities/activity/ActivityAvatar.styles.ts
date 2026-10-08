import { css } from '@safely/web-ui/styled-system/css';

export const rootStyles = css({
    position: 'relative',
    display: 'flex',
    flexShrink: 0
});

export const badgeStyles = css({
    position: 'absolute',
    right: '-6px',
    bottom: '-6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderWidth: 'illustrationLine',
    borderStyle: 'solid',
    borderColor: 'background.primary',
    borderRadius: 'full',
    backgroundColor: 'background.tertiary'
});
