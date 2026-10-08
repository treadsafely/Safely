import { css } from '@safely/web-ui/styled-system/css';

export const skeletonStyles = css({
    display: 'block',
    width: 'var(--skeleton-width)',
    height: 'var(--skeleton-height)',
    borderRadius: 'xss',
    backgroundColor: 'other.transparentElement',
    animation: 'pulse 1.6s ease-in-out infinite'
});
