import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({ width: '400px' });

export const iconStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '32'
});

export const warningsStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '8',
    marginInline: '8',
    padding: '16',
    borderRadius: 'sm',
    backgroundColor: 'background.tertiary'
});

export const warningStyles = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8'
});

export const bulletStyles = css({
    flexShrink: 0,
    width: '4px',
    height: '4px',
    marginTop: '8',
    borderRadius: 'full',
    backgroundColor: 'text.tertiary'
});

export const actionsStyles = css({ flexDirection: 'row' });

export const actionStyles = css({ flex: '1' });
