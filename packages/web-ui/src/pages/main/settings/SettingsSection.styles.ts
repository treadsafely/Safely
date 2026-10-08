import { css } from '@safely/web-ui/styled-system/css';

export const listStyles = css({
    flex: '1',
    minHeight: '0',
    padding: '8',
    overflowY: 'auto'
});

export const addAccountStyles = css({ marginTop: '16' });

export const destructiveGroupStyles = css({ marginTop: '16' });

export const adjacentGroupStyles = css({ marginTop: '2' });

export const symbolStyles = css({
    minWidth: '44px'
});

export const currencyRowStyles = css({
    display: 'flex',
    alignItems: 'baseline',
    gap: '8'
});

export const walletRowStyles = css({ justifyContent: 'flex-start' });
