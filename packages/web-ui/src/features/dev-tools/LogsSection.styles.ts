import { css } from '@safely/web-ui/styled-system/css';

export const rootStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0'
});

export const toolbarStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '8',
    paddingInline: '24',
    paddingBlock: '12'
});

export const filtersStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '8',
    paddingInline: '24',
    paddingBottom: '12'
});

export const chipRowStyles = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6'
});

export const listStyles = css({
    flex: '1',
    minHeight: '0',
    overflowY: 'auto',
    paddingInline: '24',
    paddingBottom: '24'
});

export const rowStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
    paddingBlock: '10',
    borderBottomWidth: 'hairline',
    borderBottomStyle: 'solid',
    borderColor: 'background.tertiary',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    backgroundColor: 'transparent',
    borderTopWidth: '0',
    borderInlineWidth: '0'
});

export const rowMetaStyles = css({
    display: 'flex',
    alignItems: 'baseline',
    gap: '8',
    minWidth: '0'
});

export const scopeStyles = css({ minWidth: '0' });

export const messageStyles = css({
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
});

export const collapsedMessageStyles = css({ lineClamp: 8 });

export const emptyStyles = css({ paddingBlock: '48', textAlign: 'center' });
