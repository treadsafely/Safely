import { css } from '@safely/web-ui/styled-system/css';

export const fieldStyles = css({ paddingInline: '8' });

export const labelStyles = css({
    display: 'block',
    paddingInline: '8',
    paddingBottom: '8'
});

export const boxStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '12',
    paddingBlock: '16',
    paddingLeft: '16',
    paddingRight: '24',
    borderRadius: 'sm',
    borderWidth: 'hairline',
    borderStyle: 'solid',
    borderColor: 'background.tertiary',
    backgroundColor: 'input.background',
    _focusWithin: {
        borderColor: 'input.focused.border',
        boxShadow: 'inset 0 0 0 0.5px token(colors.input.focused.border)'
    },
    '&[data-invalid], &[data-invalid]:focus-within': {
        borderColor: 'input.error.border',
        boxShadow: 'inset 0 0 0 0.5px token(colors.input.error.border)'
    }
});

export const valuesStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minWidth: '0',
    gap: '4'
});

export const amountRowStyles = css({
    display: 'flex',
    alignItems: 'baseline',
    gap: '4',
    minWidth: '0',
    overflow: 'hidden'
});

export const approximateStyles = css({ textStyle: 'titleS', color: 'text.tertiary' });

export const amountInputStyles = css({
    minWidth: '1ch',
    maxWidth: '100%',
    textStyle: 'titleL',
    color: 'text.primary',
    caretColor: 'accent.accent',
    backgroundColor: 'transparent',
    borderWidth: '0',
    padding: '0',
    outline: 'none',
    fieldSizing: 'content',
    _placeholder: { color: 'text.tertiary' }
});

export const suffixStyles = css({
    flexShrink: 0,
    textStyle: 'bodyM',
    color: 'text.tertiary'
});

export const alternativeStyles = css({
    display: 'flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: '4',
    color: 'text.tertiary',
    backgroundColor: 'transparent',
    borderWidth: '0',
    padding: '0',
    textStyle: 'bodyM',
    cursor: 'pointer',
    _disabled: { cursor: 'default' }
});

export const statusRowStyles = css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8',
    paddingInline: '8',
    paddingTop: '12'
});

export const maxStyles = css({
    color: 'text.secondary',
    backgroundColor: 'transparent',
    borderWidth: '0',
    padding: '0',
    textStyle: 'bodyM',
    cursor: 'pointer'
});
