import { css } from '@safely/web-ui/styled-system/css';

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%'
});

export const topAlignedBodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: '1',
    width: '100%'
});

export const centeredBodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '1',
    width: '100%',
    gap: '16'
});

export const imageStyles = css({
    display: 'block',
    width: '100%',
    maxWidth: '390px',
    height: 'auto'
});

export const croppedImageStyles = css({
    display: 'flex',
    alignItems: 'flex-end',
    width: '100%',
    maxWidth: '390px',
    height: '131px',
    overflow: 'hidden'
});

export const compactImageStyles = css({
    display: 'flex',
    alignItems: 'flex-end',
    width: '100%',
    maxWidth: '390px',
    height: '112px'
});

export const stepsStyles = css({
    width: '100%',
    paddingInline: '24',
    paddingBlock: '16'
});

export const submitStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '8',
    paddingBottom: '16'
});
