import { css } from '@safely/web-ui/styled-system/css';

export const sidebarStyles = css({ paddingTop: '44px' });

export const walletsStyles = css({
    flex: '1',
    minHeight: '0',
    paddingInline: '8',
    overflowY: 'auto'
});

export const draggingListStyles = css({ cursor: 'grabbing', '& *': { cursor: 'grabbing' } });

export const walletRowStyles = css({ touchAction: 'none', userSelect: 'none' });

export const draggingStyles = css({ position: 'relative', zIndex: 1 });

export const navigationStyles = css({ flexShrink: 0, padding: '8' });
