import { css } from '@safely/web-ui/styled-system/css';

export const QR_SIZE = 198;

export const popupStyles = css({ width: '480px' });

export const qrStyles = css({
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '64'
});

export const cardStyles = css({
    margin: '16',
    padding: '24',
    borderWidth: '0',
    borderRadius: 'xl',
    backgroundColor: 'other.constant.white',
    lineHeight: '0',
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

export const contentStyles = css({ paddingTop: '16' });

export const bannerStyles = css({
    width: 'auto',
    margin: '24'
});
