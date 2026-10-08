import { css } from '@safely/web-ui/styled-system/css';

export const popupStyles = css({ width: '480px' });

export const supportButtonStyles = css({
    position: 'absolute',
    top: '12',
    left: '12',
    zIndex: 1
});

export const introStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16',
    paddingTop: '64',
    paddingBottom: '24',
    borderBottomWidth: 'hairline',
    borderBottomStyle: 'solid',
    borderBottomColor: 'other.transparentElement'
});

export const scrollStyles = css({
    flex: '1',
    minHeight: '0',
    overflowY: 'auto'
});

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '16',
    paddingInline: '24',
    paddingBlock: '16'
});

export const headingStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8',
    paddingInline: '16'
});

export const questionStyles = css({ width: '100%' });

export const questionTitleStyles = css({
    display: 'block',
    paddingBottom: '8'
});

export const hintStyles = css({ marginTop: '8' });

export const hintTextStyles = css({
    gap: '4',
    maxWidth: '342px'
});

export const hintActionStyles = css({ paddingTop: '8' });

export const dismissStyles = css({ alignSelf: 'center' });
