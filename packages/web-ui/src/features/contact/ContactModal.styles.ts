import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({
    width: '480px',
    height: '636px',
    maxHeight: 'calc(100vh - token(spacing.32))'
});

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '8',
    flex: '1',
    minHeight: '0',
    paddingInline: '24',
    overflowY: 'auto'
});

export const fieldStyles = css({ padding: '0' });

export const errorStyles = css({ paddingInline: '16', paddingTop: '8' });

export const noteStyles = css({ paddingInline: '16' });

export const removeStyles = css({
    alignSelf: 'flex-start',
    color: 'accent.red',
    backgroundColor: 'transparent',
    borderWidth: '0',
    paddingInline: '16',
    paddingBlock: '8',
    textStyle: 'bodyM',
    cursor: 'pointer'
});
