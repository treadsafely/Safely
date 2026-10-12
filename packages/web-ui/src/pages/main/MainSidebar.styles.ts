import { css } from '@safely/web-ui/styled-system/css';

export const sidebarStyles = css({
    justifyContent: 'space-between',
    padding: '8',
    paddingTop: '44px'
});

export const walletListStyles = css({ cursor: 'grab', '& *': { cursor: 'grab' } });

export const draggingListStyles = css({ cursor: 'grabbing', '& *': { cursor: 'grabbing' } });

export const walletRowStyles = css({ touchAction: 'none', userSelect: 'none' });

export const draggingStyles = css({ position: 'relative', zIndex: 1 });
