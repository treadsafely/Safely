import { css } from '@safely/web-ui/styled-system/css';

export const scrollStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: '1',
    minHeight: '0',
    overflowY: 'auto',
    paddingInline: '8',
    paddingBottom: '24'
});

export const groupTitleStyles = css({
    paddingInline: '16',
    paddingTop: '16',
    paddingBottom: '8'
});

export const bubbleStyles = css({
    maxWidth: '340px',
    marginBottom: '8',
    paddingInline: '16',
    paddingBlock: '12',
    borderRadius: 'md',
    backgroundColor: 'background.secondary',
    textAlign: 'left',
    wordBreak: 'break-word'
});

export const skeletonBubbleStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '8'
});

export const boldStyles = css({ fontWeight: '600' });

export const bulletStyles = css({
    _before: { content: '"\\A•  "', whiteSpace: 'pre' }
});

export const linkStyles = css({
    color: 'text.link',
    cursor: 'pointer',
    textAlign: 'left'
});

export const externalLinkStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '12',
    cursor: 'pointer',
    textAlign: 'left'
});

export const externalLinkBodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
    flex: '1',
    minWidth: '0'
});

export const externalLinkImageStyles = css({
    flexShrink: 0,
    width: '56px',
    height: '56px',
    borderRadius: 'xs',
    objectFit: 'cover'
});
