import { css } from '@safely/web-ui/styled-system/css';

export const rootStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '12',
    paddingInline: '16',
    paddingTop: '12',
    paddingBottom: '16'
});

export const rootCollapsedStyles = css({
    paddingBottom: '12'
});

export const headerStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2'
});

export const headerRowStyles = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8'
});

export const priceGroupStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '8'
});

export const controlsStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '4'
});

export const collapseToggleStyles = css({
    paddingBlock: '2',
    paddingLeft: '16',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textStyle: 'bodyM',
    color: 'text.tertiary',
    whiteSpace: 'nowrap',
    transition: 'color 0.12s',
    _hover: { color: 'text.secondary' }
});

export const diffBadgeStyles = css({
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 'xss',
    paddingBlock: '2',
    paddingInline: '6',
    textStyle: 'bodyM',
    fontVariantNumeric: 'tabular-nums',
    transition: 'opacity 0.18s ease-in-out'
});

export const diffBadgePositiveStyles = css({
    background: 'badge.success.background',
    color: 'badge.success.foreground'
});

export const diffBadgeNegativeStyles = css({
    background: 'badge.error.background',
    color: 'badge.error.foreground'
});

export const diffBadgeFadedStyles = css({
    opacity: '0.56'
});

export const periodsStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '4'
});

export const periodButtonStyles = css({
    display: 'inline-flex',
    alignItems: 'center',
    height: '24px',
    paddingInline: '8',
    borderRadius: 'xss',
    borderWidth: 'hairline',
    borderStyle: 'solid',
    borderColor: 'transparent',
    cursor: 'pointer',
    background: 'transparent',
    color: 'text.primary',
    textStyle: 'bodyM',
    whiteSpace: 'nowrap',
    transition: 'background 0.12s, border-color 0.12s',
    _hover: { background: 'other.hover' },
    '&[data-pressed]': {
        background: 'background.secondary',
        borderColor: 'other.transparentElement'
    }
});

export const plotStyles = css({
    position: 'relative',
    width: 'full',
    aspectRatio: '7 / 2',
    minHeight: '132px',
    maxHeight: '260px',
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'crosshair'
});

export const svgStyles = css({
    display: 'block',
    width: 'full',
    height: 'full',
    overflow: 'visible'
});

export const mainLineStyles = css({
    stroke: 'chart.line',
    strokeWidth: '1.5',
    strokeLinejoin: 'round',
    strokeLinecap: 'round'
});

export const fadedLineStyles = css({
    stroke: 'chart.line',
    strokeWidth: '1.5',
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
    opacity: '0.48'
});

export const refLineStyles = css({
    stroke: 'other.transparentElement',
    strokeWidth: '0.5'
});

export const crosshairLineStyles = css({
    stroke: 'icon.tertiary',
    strokeWidth: '1'
});

export const dotStyles = css({
    fill: 'chart.line',
    stroke: 'background.primary',
    strokeWidth: '2'
});

export const legendStyles = css({
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none'
});

export const legendLabelStyles = css({
    position: 'absolute',
    right: '0',
    transform: 'translateY(-20px)',
    fontFamily: 'ui-monospace, monospace',
    textStyle: 'bodyS',
    color: 'text.tertiary',
    whiteSpace: 'nowrap'
});

export const liveDotStyles = css({
    position: 'absolute',
    width: '6px',
    height: '6px',
    borderRadius: 'full',
    background: 'chart.line',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    boxShadow: '0 0 0 3px var(--colors-background-primary)'
});

export const ticksStyles = css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '8px',
    opacity: '0.56'
});

export const tickSmallStyles = css({
    width: '1px',
    height: '2px',
    background: 'icon.tertiary'
});

export const tickMediumStyles = css({
    width: '1px',
    height: '4px',
    background: 'icon.secondary'
});

export const tickMediumTertiaryStyles = css({
    width: '1px',
    height: '4px',
    background: 'icon.tertiary'
});

export const tickLargeStyles = css({
    width: '1px',
    height: '8px',
    background: 'icon.secondary'
});

export const footerStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '6'
});

export const footerDatesStyles = css({
    position: 'relative',
    minHeight: '16px'
});

export const datesRowStyles = css({
    display: 'flex',
    transition: 'opacity 0.12s'
});

export const datesHiddenStyles = css({
    opacity: '0'
});

export const footerDateCellStyles = css({
    flex: '1',
    minWidth: '0'
});

export const footerDateStyles = css({
    textStyle: 'bodyS',
    color: 'text.tertiary'
});

export const activeTimeStyles = css({
    position: 'absolute',
    top: '0',
    transform: 'translateX(-50%)',
    fontFamily: 'ui-monospace, monospace',
    textStyle: 'bodyS',
    color: 'text.tertiary',
    whiteSpace: 'nowrap',
    pointerEvents: 'none'
});

export const attributionStyles = css({
    textStyle: 'bodyS',
    color: 'text.tertiary',
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    padding: '0',
    alignSelf: 'flex-start',
    _hover: { color: 'text.secondary' }
});

export const skeletonStyles = css({
    width: 'full',
    aspectRatio: '7 / 2',
    minHeight: '132px',
    maxHeight: '260px'
});
