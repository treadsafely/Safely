import { css } from '@safely/web-ui/styled-system/css';

export const mediaStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingBottom: '8'
});

export const tableStyles = css({ paddingTop: '16' });

export const noteStyles = css({ paddingTop: '16' });

export const buttonsStyles = css({
    display: 'flex',
    gap: '8',
    paddingTop: '24',
    '& > *': { flex: '1' }
});

export const trustedSiteStyles = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8',
    paddingBlock: '16',
    cursor: 'pointer'
});
