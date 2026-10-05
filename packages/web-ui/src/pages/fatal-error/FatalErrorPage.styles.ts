import { css } from '@safely/web-ui/styled-system/css';

export const rootStyles = css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: 'background.primary'
});

export const headerStyles = css({
    flexShrink: 0,
    height: '52px',
    appRegion: 'drag'
});

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24',
    paddingInline: '32',
    paddingBottom: '32'
});

export const contentStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16',
    width: '400px',
    maxWidth: '100%'
});

export const textStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8',
    whiteSpace: 'pre-line'
});

export const actionsStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '8',
    width: '280px',
    maxWidth: '100%'
});
