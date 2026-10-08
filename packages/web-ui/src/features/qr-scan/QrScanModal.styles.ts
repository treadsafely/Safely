import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({
    width: '480px',
    height: 'calc(100vh - token(spacing.64))'
});

/* mirrored the way every self-view is; the decoder reads the raw frame, so the flip cannot reach it */
export const videoStyles = css({
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)'
});

export const maskStyles = css({
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
});

/* the scrim is the frame's own shadow, so the cut-out can never drift away from the corners */
export const frameStyles = css({
    position: 'relative',
    width: '290px',
    height: '290px',
    borderRadius: 'xl',
    boxShadow: '0 0 0 9999px token(colors.background.overlay)'
});

export const cornerStyles = css({
    position: 'absolute',
    width: '48px',
    height: '48px',
    borderColor: 'other.constant.white',
    borderStyle: 'solid',
    borderWidth: '0'
});

export const cornerTopLeftStyles = css({
    top: '0',
    left: '0',
    borderTopWidth: 'illustrationLine',
    borderLeftWidth: 'illustrationLine',
    borderTopLeftRadius: 'xl'
});

export const cornerTopRightStyles = css({
    top: '0',
    right: '0',
    borderTopWidth: 'illustrationLine',
    borderRightWidth: 'illustrationLine',
    borderTopRightRadius: 'xl'
});

export const cornerBottomLeftStyles = css({
    bottom: '0',
    left: '0',
    borderBottomWidth: 'illustrationLine',
    borderLeftWidth: 'illustrationLine',
    borderBottomLeftRadius: 'xl'
});

export const cornerBottomRightStyles = css({
    bottom: '0',
    right: '0',
    borderBottomWidth: 'illustrationLine',
    borderRightWidth: 'illustrationLine',
    borderBottomRightRadius: 'xl'
});

export const textStyles = css({
    position: 'absolute',
    top: '26px',
    insetInline: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
    padding: '32',
    /* it reaches into the close button's corner */
    pointerEvents: 'none'
});

export const subtitleStyles = css({ opacity: 0.64 });

export const sourceStyles = css({
    position: 'absolute',
    bottom: '0',
    insetInline: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8',
    minHeight: '48px',
    paddingLeft: '16',
    borderWidth: '0',
    backgroundColor: 'transparent',
    cursor: 'pointer'
});
