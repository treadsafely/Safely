import { css } from '@safely/web-ui/styled-system/css';

export const versionStyles = css({
    paddingInline: '16',
    paddingTop: '8',
    paddingBottom: '24'
});

export const listStyles = css({
    flex: '1',
    minHeight: '0',
    padding: '8',
    overflowY: 'auto'
});

export const walletRowStyles = css({ justifyContent: 'flex-start' });

export const valueRowStyles = css({ gap: '16' });

export const valueRowTitleStyles = css({ flexShrink: 0 });

export const valueRowValueStyles = css({
    flexShrink: 1,
    minWidth: '0',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
});
