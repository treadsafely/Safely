import { css } from '@safely/web-ui/styled-system/css';

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    overflowY: 'auto'
});

export const heroStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16',
    padding: '32'
});

export const amountStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
    width: '100%'
});

export const tableStyles = css({
    gap: '2',
    padding: '8'
});
