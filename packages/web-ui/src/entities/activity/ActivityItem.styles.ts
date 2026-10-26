import { css } from '@safely/web-ui/styled-system/css';

export const pendingStyles = css({
    backgroundColor: 'background.tertiary'
});

export const titleRowStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '4',
    minWidth: '0'
});

// asymmetric padding drops the 12.5px label onto the title's baseline instead of the row's centre
export const timestampStyles = css({
    flexShrink: 0,
    paddingTop: '6',
    paddingBottom: '2',
    fontSize: '12.5px',
    lineHeight: '16px'
});

export const amountStyles = css({
    flex: '1',
    minWidth: '0'
});

export const counterpartyStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '6',
    minWidth: '0'
});

export const contactIconStyles = css({
    color: 'var(--contact-color)'
});

export const providerStyles = css({
    textTransform: 'capitalize'
});
