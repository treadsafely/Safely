import { css } from '@safely/web-ui/styled-system/css';

export const rootStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16',
    width: '100%',
    /* 480 of content inside a 32 gutter, the column the design centres in the content area */
    maxWidth: '544px',
    marginInline: 'auto',
    paddingInline: '32',
    paddingBlock: '32'
});

export const headingStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8',
    paddingInline: '16'
});

export const actionsStyles = css({
    display: 'flex',
    justifyContent: 'center',
    gap: '8'
});

export const listStyles = css({ width: '100%' });

/* the recipe spreads a row's ends apart, and the badge belongs next to the name */
export const nameRowStyles = css({ justifyContent: 'flex-start' });

export const stepsStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
    width: '100%',
    padding: '16',
    borderRadius: 'md',
    backgroundColor: 'background.secondary'
});

export const stepStyles = css({
    display: 'flex',
    alignItems: 'baseline',
    gap: '8'
});

export const stepNumberStyles = css({ flex: 'none', width: '16px' });

export const archivedToggleStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '4',
    padding: '8',
    backgroundColor: 'transparent',
    borderWidth: '0',
    cursor: 'pointer'
});
