import { css } from '@safely/web-ui/styled-system/css';

export const valueStyles = css({ marginLeft: 'auto' });

export const groupStyles = css({
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'cell.default.background'
});

export const groupTitleStyles = css({ color: 'text.tertiary' });

export const groupRowStyles = css({ justifyContent: 'flex-start' });

export const derivationRowStyles = css({ touchAction: 'none', userSelect: 'none' });

export const derivationCellStyles = css({
    marginLeft: '24',
    width: 'calc(100% - token(spacing.24))',
    borderRadius: 'sm',
    overflow: 'hidden'
});

export const draggingDerivationStyles = css({ position: 'relative', zIndex: 1 });
