import { css } from '@safely/web-ui/styled-system/css';

export const rootStyles = css({ paddingInline: '8' });

export const labelStyles = css({
    display: 'block',
    paddingInline: '8',
    paddingBottom: '8'
});

export const boxStyles = css({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8',
    padding: '16',
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

export const fieldStyles = css({
    position: 'relative',
    flex: '1',
    minWidth: '0'
});

export const inputStyles = css({
    display: 'block',
    width: '100%',
    textStyle: 'bodyL',
    color: 'text.primary',
    caretColor: 'accent.accent',
    backgroundColor: 'transparent',
    borderWidth: '0',
    padding: '0',
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    fieldSizing: 'content',
    wordBreak: 'break-all',
    _placeholder: { color: 'text.tertiary' }
});

export const recognisedNameStyles = css({
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    gap: '8',
    color: 'text.tertiary',
    textStyle: 'bodyL',
    whiteSpace: 'nowrap',
    pointerEvents: 'none'
});

export const mirrorStyles = css({
    position: 'absolute',
    top: '0',
    left: '0',
    textStyle: 'bodyL',
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
    visibility: 'hidden',
    pointerEvents: 'none'
});

export const pickedInputStyles = css({
    color: 'text.tertiary',
    whiteSpace: 'nowrap',
    overflow: 'hidden'
});

export const pickedRowStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '8',
    flex: '1',
    minWidth: '0',
    textStyle: 'bodyL',
    whiteSpace: 'nowrap'
});

export const clearStyles = css({
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: 'transparent',
    borderWidth: '0',
    padding: '0',
    cursor: 'pointer'
});

export const errorStyles = css({ paddingInline: '8', paddingTop: '8' });
