import { css } from '@safely/web-ui/styled-system/css';

export const lengthToggleStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '8',
    height: '40px',
    paddingLeft: '16',
    paddingRight: '12',
    borderRadius: 'sm',
    backgroundColor: 'background.primary',
    borderWidth: 'hairlineAlternate',
    borderStyle: 'solid',
    borderColor: 'other.transparentElement'
});

export const descriptionStyles = css({ whiteSpace: 'pre-line' });
