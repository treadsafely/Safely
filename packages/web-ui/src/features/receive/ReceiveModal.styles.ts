import { css } from '@safely/web-ui/styled-system/css';

export const QR_SIZE = 198;
export const LOGO_SIZE = 48;

export const popupStyles = css({
    width: '480px',
    paddingBottom: '32'
});

export const contentStyles = css({ paddingTop: '48' });

export const bodyStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '24',
    paddingBottom: '8'
});

export const cardStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12',
    paddingTop: '24',
    paddingInline: '24',
    paddingBottom: '16',
    borderRadius: 'lg',
    backgroundColor: 'other.constant.white'
});

export const qrStyles = css({ position: 'relative', lineHeight: '0' });

/* the modules under the logo are lost on purpose: error correction H covers the cutout */
export const cutoutStyles = css({
    position: 'absolute',
    top: '50%',
    left: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '66px',
    height: '66px',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'other.constant.white'
});

export const addressStyles = css({
    maxWidth: '198px',
    fontFamily: 'ui-monospace, monospace',
    cursor: 'pointer'
});

export const copiedStyles = css({
    position: 'absolute',
    bottom: '12',
    left: '50%',
    transform: 'translateX(-50%)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none'
});

export const badgesStyles = css({
    display: 'flex',
    justifyContent: 'center',
    gap: '8'
});

export const actionsStyles = css({
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '8',
    paddingBottom: '16',
    paddingInline: '64'
});
