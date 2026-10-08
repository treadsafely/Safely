import { css } from '@safely/web-ui/styled-system/css';

export const rootStyles = css({
    position: 'fixed',
    inset: '0',
    zIndex: 'passcodePrompt',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: 'background.primary'
});

export const headerStyles = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    height: '52px',
    paddingInline: '12',
    appRegion: 'drag'
});

export const closeStyles = css({
    width: '40px',
    height: '40px',
    borderRadius: 'full',
    appRegion: 'no-drag'
});

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16',
    paddingBottom: '32'
});

export const promptStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8',
    width: '480px',
    maxWidth: '100%'
});
