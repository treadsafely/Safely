import { css } from '@safely/web-ui/styled-system/css';

export const statusStyles = css({ display: 'flex', gap: '8' });

export const statusColumnStyles = css({ display: 'flex', flexDirection: 'column' });

export const pendingRowStyles = css({
    display: 'flex',
    alignItems: 'center',
    padding: '0',
    backgroundColor: 'transparent',
    borderWidth: '0',
    cursor: 'pointer'
});

export const pendingInfoStyles = css({ margin: '4' });
