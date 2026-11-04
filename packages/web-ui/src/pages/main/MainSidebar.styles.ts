import { css } from '@safely/web-ui/styled-system/css';

export const titleStripStyles = css({
    position: 'sticky',
    top: '0',
    zIndex: 2,
    flexShrink: 0,
    height: '44px',
    backgroundColor: 'background.secondary'
});

export const walletsStyles = css({ flexGrow: 1, paddingInline: '8' });

export const walletListStyles = css({ cursor: 'grab', '& *': { cursor: 'grab' } });

export const draggingListStyles = css({ cursor: 'grabbing', '& *': { cursor: 'grabbing' } });

export const walletRowStyles = css({ touchAction: 'none', userSelect: 'none' });

export const draggingStyles = css({ position: 'relative', zIndex: 1 });

export const navigationStyles = css({
    position: 'sticky',
    bottom: '0',
    zIndex: 2,
    flexShrink: 0,
    padding: '8',
    backgroundColor: 'background.secondary'
});
