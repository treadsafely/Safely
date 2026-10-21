import { css } from '@safely/web-ui/styled-system/css';

export const introStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8',
    paddingInline: '32',
    paddingTop: '48',
    paddingBottom: '24'
});

export const titleStyles = css({ textStyle: 'titleM', textAlign: 'center' });

export const descriptionStyles = css({ textWrap: 'balance' });

export const emptyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    flex: '1',
    minHeight: '0'
});

export const actionStyles = css({ marginTop: '8' });
