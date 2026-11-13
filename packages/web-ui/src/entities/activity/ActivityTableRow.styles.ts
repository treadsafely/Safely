import { css } from '@safely/web-ui/styled-system/css';

export const columnsStyles = css({
    display: 'grid',
    gridTemplateColumns:
        'minmax(172px, max-content) 120px 160px minmax(0, 1fr) minmax(132px, max-content)',
    columnGap: '8',
    '&[data-compact]': {
        gridTemplateColumns:
            '88px 88px minmax(0, 1fr) minmax(80px, max-content) minmax(128px, max-content)'
    }
});

export const gridStyles = css({
    display: 'grid',
    gridTemplateColumns: 'subgrid',
    gridColumn: '1 / -1',
    alignItems: 'center',
    minHeight: '40px',
    paddingInline: '16',
    paddingBlock: '0',
    borderRadius: 'sm'
});

export const interactiveStyles = css({
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.12s',
    _hover: { background: 'other.hover' },
    _selected: { background: 'background.tertiary' }
});

export const cellStyles = css({
    display: 'flex',
    minWidth: '0'
});

export const typeStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '8',
    minWidth: '0'
});

export const endCellStyles = css({
    display: 'flex',
    justifyContent: 'flex-end',
    minWidth: '0'
});
