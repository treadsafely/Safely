import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({
    width: '480px',
    height: '636px',
    maxHeight: 'calc(100vh - token(spacing.32))'
});

export const lengthToggleStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '8',
    height: '40px',
    paddingLeft: '16',
    paddingRight: '12',
    borderRadius: 'full',
    borderWidth: 'hairlineAlternate',
    borderStyle: 'solid',
    borderColor: 'other.transparentElement'
});

export const descriptionStyles = css({ whiteSpace: 'pre-line' });

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0'
});

export const keypadFillStyles = css({
    flex: '1',
    justifyContent: 'space-between'
});
