import { css } from '@safely/web-ui/styled-system/css';

export const bodyStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    overflowY: 'auto'
});

export const heroStyles = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16',
    paddingTop: '8',
    paddingBottom: '32'
});

export const successStyles = heroStyles;

export const iconSlotStyles = css({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '72px',
    height: '72px'
});

export const successIconStyles = css({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
});

export const listStyles = css({ display: 'flex', flexDirection: 'column', gap: '2', padding: '8' });

export const actionsStyles = css({ padding: '8' });

export const transactionStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '12'
});

export const linkStyles = css({
    display: 'flex',
    alignItems: 'center',
    color: 'icon.secondary',
    backgroundColor: 'transparent',
    borderWidth: '0',
    padding: '0',
    cursor: 'pointer'
});
