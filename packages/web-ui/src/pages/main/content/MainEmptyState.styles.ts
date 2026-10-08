import { css } from '@safely/web-ui/styled-system/css';

export const containerStyles = css({
    paddingInline: '24',
    paddingBottom: '32'
});

export const badgeStyles = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '72px',
    height: '72px',
    marginBottom: '16',
    borderRadius: 'full',
    borderWidth: 'border',
    borderStyle: 'dashed',
    borderColor: 'other.transparentElement',
    color: 'icon.tertiary'
});
